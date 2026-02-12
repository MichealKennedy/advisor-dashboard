import { useState, useEffect, useCallback, useMemo } from '@wordpress/element';
import {
	useReactTable,
	getCoreRowModel,
	flexRender,
} from '@tanstack/react-table';
import { getContacts, getFilterDates } from '../../../shared/api';
import { formatDate } from '../../../shared/utils';

export default function ContactTable( { tab, columns, defaultSort, dateFilterField } ) {
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
		getFilterDates( tab, dateFilterField )
			.then( setDateOptions )
			.catch( () => setDateOptions( [] ) );
	}, [ tab, dateFilterField ] );

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
	}, [ tab, pagination.pageIndex, pagination.pageSize, sorting, debouncedSearch, dateFilter, dateFilterField, defaultSort.key ] );

	useEffect( () => {
		fetchData();
	}, [ fetchData ] );

	// Build TanStack column definitions.
	const tableColumns = useMemo(
		() =>
			columns.map( ( col ) => ( {
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
			} ) ),
		[ columns ]
	);

	const table = useReactTable( {
		data,
		columns: tableColumns,
		state: { sorting, pagination },
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
			if ( dateFilter && dateFilterField ) {
				exportParams.date_filter = dateFilter;
				exportParams.date_field = dateFilterField;
			}
			const result = await getContacts( exportParams );

			const headers = columns.map( ( c ) => c.label );
			const rows = result.data.map( ( row ) =>
				columns.map( ( c ) => {
					let val = row[ c.key ] || '';
					if ( c.type === 'date' ) {
						val = formatDate( val );
					}
					val = String( val );
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
				<button
					className="advdash__export-btn"
					onClick={ handleExport }
					disabled={ data.length === 0 || isExporting }
				>
					{ isExporting ? 'Exporting...' : 'Download CSV' }
				</button>
			</div>

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
													cursor: 'pointer',
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
									<tr key={ row.id } className="advdash__tr">
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
		</div>
	);
}
