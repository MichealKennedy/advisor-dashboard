import { useState, useEffect, useCallback, useMemo } from '@wordpress/element';
import {
	useReactTable,
	getCoreRowModel,
	flexRender,
} from '@tanstack/react-table';
import { getContacts, getFilterDates, getContactSummary, deleteContact, saveColumnPrefs } from '../../../shared/api';
import { formatDate } from '../../../shared/utils';
import ColumnToggle from './ColumnToggle';
import ContactDetailPanel from './ContactDetailPanel';

export default function ContactTable( { tab, columns, pinnedColumns, defaultSort, dateFilterField, dashboardId, isAdmin } ) {
	// Server data state.
	const [ data, setData ] = useState( [] );
	const [ total, setTotal ] = useState( 0 );
	const [ totalPages, setTotalPages ] = useState( 0 );
	const [ isLoading, setIsLoading ] = useState( true );
	const [ error, setError ] = useState( null );

	// Table control state.
	const [ pagination, setPagination ] = useState( {
		pageIndex: 0,
		pageSize: 50,
	} );
	const [ sorting, setSorting ] = useState( [
		{ id: defaultSort.key, desc: defaultSort.direction === 'desc' },
	] );
	const [ search, setSearch ] = useState( '' );
	const [ debouncedSearch, setDebouncedSearch ] = useState( '' );
	const [ isExporting, setIsExporting ] = useState( false );
	const [ selectedContact, setSelectedContact ] = useState( null );
	const [ refreshKey, setRefreshKey ] = useState( 0 );

	// Column visibility state (persisted to server via user meta, cached in localStorage).
	const colVisKey = `advdash_colvis_${ tab }`;
	const [ columnVisibility, setColumnVisibility ] = useState( () => {
		// Prefer server-provided prefs, fall back to localStorage cache.
		const serverPrefs = window.advdashFrontend?.columnPrefs?.[ tab ];
		if ( serverPrefs && typeof serverPrefs === 'object' ) {
			return serverPrefs;
		}
		try {
			const saved = localStorage.getItem( colVisKey );
			return saved ? JSON.parse( saved ) : {};
		} catch {
			return {};
		}
	} );

	// Debounce save to server to avoid rapid API calls while toggling columns.
	const saveTimerRef = useCallback( () => {
		let timer = null;
		return ( allPrefs ) => {
			clearTimeout( timer );
			timer = setTimeout( () => {
				saveColumnPrefs( allPrefs ).catch( () => {} );
			}, 1000 );
		};
	}, [] );
	const debouncedSave = useMemo( saveTimerRef, [ saveTimerRef ] );

	useEffect( () => {
		// Cache in localStorage for fast reload.
		try {
			localStorage.setItem( colVisKey, JSON.stringify( columnVisibility ) );
		} catch {
			// Ignore storage errors.
		}

		// Build full prefs object from all tabs' localStorage and save to server.
		const allPrefs = {};
		const tabKeys = [ 'current_registrations', 'attended_report', 'attended_other', 'fed_request' ];
		tabKeys.forEach( ( t ) => {
			if ( t === tab ) {
				allPrefs[ t ] = columnVisibility;
			} else {
				try {
					const cached = localStorage.getItem( `advdash_colvis_${ t }` );
					if ( cached ) {
						allPrefs[ t ] = JSON.parse( cached );
					}
				} catch {
					// Skip.
				}
			}
		} );
		debouncedSave( allPrefs );
	}, [ columnVisibility, colVisKey, tab, debouncedSave ] );

	// Date filter state.
	const [ dateFilter, setDateFilter ] = useState( '' );
	const [ dateOptions, setDateOptions ] = useState( [] );

	// Compute the total count across all dates for the "All dates" label.
	const allDatesTotal = useMemo(
		() => dateOptions.reduce( ( sum, d ) => sum + parseInt( d.count, 10 ), 0 ),
		[ dateOptions ]
	);

	// Fetch distinct dates for the filter dropdown.
	useEffect( () => {
		if ( ! dateFilterField ) {
			return;
		}
		getFilterDates( tab, dateFilterField, dashboardId )
			.then( setDateOptions )
			.catch( () => setDateOptions( [] ) );
	}, [ tab, dateFilterField, dashboardId, refreshKey ] );

	// Debounce search input.
	useEffect( () => {
		const timer = setTimeout( () => {
			setDebouncedSearch( search );
			// Reset to first page on new search.
			setPagination( ( prev ) => ( { ...prev, pageIndex: 0 } ) );
		}, 300 );
		return () => clearTimeout( timer );
	}, [ search ] );

	// Fetch data when controls change.
	const fetchData = useCallback( async () => {
		setIsLoading( true );
		setError( null );
		try {
			const sortCol = sorting[ 0 ]?.id || defaultSort.key;
			const sortDir = sorting[ 0 ]?.desc ? 'desc' : 'asc';
			const params = {
				tab,
				page: pagination.pageIndex + 1,
				per_page: pagination.pageSize,
				orderby: sortCol,
				order: sortDir,
				search: debouncedSearch,
			};
			if ( dashboardId ) {
				params.dashboard_id = dashboardId;
			}
			if ( dateFilter && dateFilterField ) {
				params.date_filter = dateFilter;
				params.date_field = dateFilterField;
			}
			const result = await getContacts( params );
			setData( result.data );
			setTotal( result.total );
			setTotalPages( result.totalPages );
		} catch ( err ) {
			setError( err.message || 'Failed to load contacts.' );
		}
		setIsLoading( false );
	}, [ tab, pagination.pageIndex, pagination.pageSize, sorting, debouncedSearch, dateFilter, dateFilterField, defaultSort.key, dashboardId, refreshKey ] );

	useEffect( () => {
		fetchData();
	}, [ fetchData ] );

	// Summary stats.
	const [ summary, setSummary ] = useState( null );

	useEffect( () => {
		const params = { tab, search: debouncedSearch };
		if ( dashboardId ) {
			params.dashboard_id = dashboardId;
		}
		if ( dateFilter && dateFilterField ) {
			params.date_filter = dateFilter;
			params.date_field = dateFilterField;
		}
		getContactSummary( params )
			.then( setSummary )
			.catch( () => setSummary( null ) );
	}, [ tab, debouncedSearch, dateFilter, dateFilterField, dashboardId, refreshKey ] );

	// Format a breakdown array into "Option (count), ..." display.
	const formatBreakdown = ( items ) => {
		if ( ! items || items.length === 0 ) {
			return 'None';
		}
		return items.map( ( item ) => `${ item.option_name } (${ item.count })` ).join( ', ' );
	};

	// Delete a contact (admin only).
	const handleDelete = useCallback( async ( contactId ) => {
		if ( ! window.confirm( 'Are you sure you want to delete this contact? This action cannot be undone.' ) ) {
			return;
		}
		try {
			await deleteContact( contactId, dashboardId );
			fetchData();
		} catch ( err ) {
			setError( 'Failed to delete contact: ' + ( err.message || 'Unknown error' ) );
		}
	}, [ dashboardId, fetchData ] );

	// Build TanStack column definitions.
	const tableColumns = useMemo(
		() => {
			const cols = columns.map( ( col ) => ( {
				accessorKey: col.key,
				header: col.label,
				cell: ( info ) => {
					const val = info.getValue();
					if ( col.type === 'date' ) {
						return formatDate( val );
					}
					return val || '';
				},
				enableSorting: true,
			} ) );

			if ( isAdmin ) {
				cols.push( {
					id: 'actions',
					header: '',
					cell: ( info ) => (
						<button
							className="advdash__delete-btn"
							onClick={ ( e ) => {
								e.stopPropagation();
								handleDelete( info.row.original.id );
							} }
							title="Delete contact"
						>
							&times;
						</button>
					),
					enableSorting: false,
				} );
			}

			return cols;
		},
		[ columns, isAdmin, handleDelete ]
	);

	const table = useReactTable( {
		data,
		columns: tableColumns,
		state: { sorting, pagination, columnVisibility },
		onColumnVisibilityChange: setColumnVisibility,
		onSortingChange: ( updater ) => {
			setSorting( updater );
			// Reset to first page when sort changes.
			setPagination( ( prev ) => ( { ...prev, pageIndex: 0 } ) );
		},
		onPaginationChange: setPagination,
		getCoreRowModel: getCoreRowModel(),
		manualSorting: true,
		manualPagination: true,
		pageCount: totalPages,
	} );

	// CSV Export.
	const handleExport = async () => {
		setIsExporting( true );
		try {
			const sortCol = sorting[ 0 ]?.id || defaultSort.key;
			const sortDir = sorting[ 0 ]?.desc ? 'desc' : 'asc';
			const exportParams = {
				tab,
				page: 1,
				per_page: 5000,
				orderby: sortCol,
				order: sortDir,
				search: debouncedSearch,
			};
			if ( dashboardId ) {
				exportParams.dashboard_id = dashboardId;
			}
			if ( dateFilter && dateFilterField ) {
				exportParams.date_filter = dateFilter;
				exportParams.date_field = dateFilterField;
			}
			const result = await getContacts( exportParams );

			const visibleCols = columns.filter( ( c ) => columnVisibility[ c.key ] !== false );
			const headers = visibleCols.map( ( c ) => c.label );
			const rows = result.data.map( ( row ) =>
				visibleCols.map( ( c ) => {
					let val = row[ c.key ] || '';
					if ( c.type === 'date' ) {
						val = formatDate( val );
					}
					val = String( val );
					// Neutralize CSV formula injection.
					if ( /^[=+\-@\t\r]/.test( val ) ) {
						val = "'" + val;
					}
					// Escape CSV values.
					if (
						val.includes( ',' ) ||
						val.includes( '"' ) ||
						val.includes( '\n' )
					) {
						val = '"' + val.replace( /"/g, '""' ) + '"';
					}
					return val;
				} )
			);

			const csv = [ headers.join( ',' ), ...rows.map( ( r ) => r.join( ',' ) ) ].join( '\n' );
			const blob = new Blob( [ csv ], {
				type: 'text/csv;charset=utf-8;',
			} );
			const url = URL.createObjectURL( blob );
			const a = document.createElement( 'a' );
			a.href = url;
			a.download = `${ tab }-contacts.csv`;
			a.click();
			URL.revokeObjectURL( url );
		} catch ( err ) {
			setError( 'Failed to export CSV: ' + ( err.message || 'Unknown error' ) );
		}
		setIsExporting( false );
	};

	// Label for the "All dates" option.
	const allDatesLabel = dateFilterField === 'date_of_lead_request'
		? 'All lead request dates'
		: 'All workshop dates';

	return (
		<div className="advdash__table-container">
			<div className="advdash__table-controls">
				<input
					type="text"
					className="advdash__search-input"
					placeholder="Search by name..."
					value={ search }
					onChange={ ( e ) => setSearch( e.target.value ) }
				/>
				{ dateFilterField && dateOptions.length > 0 && (
					<select
						className="advdash__date-filter"
						value={ dateFilter }
						onChange={ ( e ) => {
							setDateFilter( e.target.value );
							setPagination( ( prev ) => ( { ...prev, pageIndex: 0 } ) );
						} }
					>
						<option value="">
							{ allDatesLabel } ({ allDatesTotal })
						</option>
						{ dateOptions.map( ( d ) => (
							<option key={ d.date_value } value={ d.date_value }>
								{ formatDate( d.date_value ) } ({ d.count })
							</option>
						) ) }
					</select>
				) }
				<ColumnToggle
					columns={ columns }
					pinnedColumns={ pinnedColumns || [] }
					columnVisibility={ columnVisibility }
					onColumnVisibilityChange={ setColumnVisibility }
				/>
				<button
					className="advdash__refresh-btn"
					onClick={ () => setRefreshKey( ( k ) => k + 1 ) }
					disabled={ isLoading }
					title="Refresh data"
				>
					{ isLoading ? 'Refreshing...' : 'Refresh' }
				</button>
				<button
					className="advdash__export-btn"
					onClick={ handleExport }
					disabled={ data.length === 0 || isExporting }
				>
					{ isExporting ? 'Exporting...' : 'Download CSV' }
				</button>
			</div>

			{ summary && tab === 'current_registrations' && (
				<div className="advdash__summary-bar">
					<div className="advdash__summary-line">
						<span className="advdash__summary-label">Registrants: { summary.total_registrants }</span>
						<span className="advdash__summary-sep">&mdash;</span>
						<span>Food: { formatBreakdown( summary.food_fed_breakdown ) }</span>
						<span className="advdash__summary-sep">&mdash;</span>
						<span>Side: { formatBreakdown( summary.side_fed_breakdown ) }</span>
					</div>
					<div className="advdash__summary-line">
						<span className="advdash__summary-label">Guests: { summary.total_guests }</span>
						<span className="advdash__summary-sep">&mdash;</span>
						<span>Food: { formatBreakdown( summary.food_spouse_breakdown ) }</span>
						<span className="advdash__summary-sep">&mdash;</span>
						<span>Side: { formatBreakdown( summary.side_spouse_breakdown ) }</span>
					</div>
				</div>
			) }

			{ summary && ( tab === 'attended_report' || tab === 'attended_other' ) && (
				<div className="advdash__summary-bar">
					<div className="advdash__summary-line">
						<span className="advdash__summary-label">Total Contacts: { summary.total }</span>
						<span className="advdash__summary-sep">&mdash;</span>
						<span>Meet for Report: { formatBreakdown( summary.meet_for_report_breakdown ) }</span>
					</div>
					<div className="advdash__summary-line">
						<span>Retirement System: { formatBreakdown( summary.retirement_system_breakdown ) }</span>
					</div>
					<div className="advdash__summary-line">
						<span>Rating: { formatBreakdown( summary.rate_material_breakdown ) }</span>
					</div>
				</div>
			) }

			{ summary && tab === 'fed_request' && (
				<div className="advdash__summary-bar">
					<div className="advdash__summary-line">
						<span className="advdash__summary-label">Total Contacts: { summary.total }</span>
						<span className="advdash__summary-sep">&mdash;</span>
						<span>Meet for Report: { formatBreakdown( summary.meet_for_report_breakdown ) }</span>
					</div>
					<div className="advdash__summary-line">
						<span>Retirement System: { formatBreakdown( summary.retirement_system_breakdown ) }</span>
					</div>
					<div className="advdash__summary-line">
						<span>Retirement Timeframe: { formatBreakdown( summary.time_frame_for_retirement_breakdown ) }</span>
					</div>
				</div>
			) }

			{ error && (
				<div className="advdash__error">
					{ error }
					<button
						className="advdash__error-dismiss"
						onClick={ () => setError( null ) }
					>
						Dismiss
					</button>
				</div>
			) }

			{ isLoading ? (
				<div className="advdash__loading">
					<div className="advdash__spinner"></div>
					<span>Loading contacts...</span>
				</div>
			) : data.length === 0 ? (
				<div className="advdash__empty">
					{ debouncedSearch
						? `No contacts found matching "${ debouncedSearch }".`
						: 'No contacts found for this tab.' }
				</div>
			) : (
				<>
					<div className="advdash__table-scroll">
						<table className="advdash__table">
							<thead>
								{ table.getHeaderGroups().map( ( hg ) => (
									<tr key={ hg.id }>
										{ hg.headers.map( ( header ) => (
											<th
												key={ header.id }
												onClick={ header.column.getToggleSortingHandler() }
												className="advdash__th"
												style={ {
													cursor: header.column.getCanSort() ? 'pointer' : 'default',
													userSelect: 'none',
												} }
											>
												{ flexRender(
													header.column.columnDef.header,
													header.getContext()
												) }
												{ { asc: ' \u25B2', desc: ' \u25BC' }[
													header.column.getIsSorted()
												] ?? '' }
											</th>
										) ) }
									</tr>
								) ) }
							</thead>
							<tbody>
								{ table.getRowModel().rows.map( ( row ) => (
									<tr
										key={ row.id }
										className={ `advdash__tr${ selectedContact?.id === row.original.id ? ' advdash__tr--selected' : '' }` }
										onClick={ () => setSelectedContact( row.original ) }
									>
										{ row.getVisibleCells().map( ( cell ) => (
											<td
												key={ cell.id }
												className="advdash__td"
											>
												{ flexRender(
													cell.column.columnDef.cell,
													cell.getContext()
												) }
											</td>
										) ) }
									</tr>
								) ) }
							</tbody>
						</table>
					</div>

					<div className="advdash__pagination">
						<button
							className="advdash__pagination-btn"
							onClick={ () => table.previousPage() }
							disabled={ ! table.getCanPreviousPage() }
						>
							&laquo; Previous
						</button>
						<span className="advdash__pagination-info">
							Page { pagination.pageIndex + 1 } of { totalPages }
							{ ' ' }({ total } contact{ total !== 1 ? 's' : '' })
						</span>
						<button
							className="advdash__pagination-btn"
							onClick={ () => table.nextPage() }
							disabled={ ! table.getCanNextPage() }
						>
							Next &raquo;
						</button>
					</div>
				</>
			) }

			{ selectedContact && (
				<ContactDetailPanel
					contact={ selectedContact }
					columns={ columns }
					dashboardId={ dashboardId }
					onClose={ () => setSelectedContact( null ) }
					onSaved={ () => {
						fetchData();
						setSelectedContact( null );
					} }
				/>
			) }
		</div>
	);
}
