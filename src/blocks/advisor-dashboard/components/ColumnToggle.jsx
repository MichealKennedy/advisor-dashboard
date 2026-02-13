import { useState, useRef, useEffect } from '@wordpress/element';

export default function ColumnToggle( { columns, pinnedColumns, columnVisibility, onColumnVisibilityChange } ) {
	const [ isOpen, setIsOpen ] = useState( false );
	const ref = useRef( null );

	// Close on click outside.
	useEffect( () => {
		if ( ! isOpen ) {
			return;
		}
		const handleClick = ( e ) => {
			if ( ref.current && ! ref.current.contains( e.target ) ) {
				setIsOpen( false );
			}
		};
		document.addEventListener( 'mousedown', handleClick );
		return () => document.removeEventListener( 'mousedown', handleClick );
	}, [ isOpen ] );

	// Close on Escape.
	useEffect( () => {
		if ( ! isOpen ) {
			return;
		}
		const handleKey = ( e ) => {
			if ( e.key === 'Escape' ) {
				setIsOpen( false );
			}
		};
		document.addEventListener( 'keydown', handleKey );
		return () => document.removeEventListener( 'keydown', handleKey );
	}, [ isOpen ] );

	const handleToggle = ( key ) => {
		onColumnVisibilityChange( ( prev ) => ( {
			...prev,
			[ key ]: prev[ key ] === false ? true : false,
		} ) );
	};

	const handleReset = () => {
		onColumnVisibilityChange( {} );
	};

	const hiddenCount = Object.values( columnVisibility ).filter( ( v ) => v === false ).length;

	return (
		<div className="advdash__col-toggle" ref={ ref }>
			<button
				className="advdash__col-toggle-btn"
				onClick={ () => setIsOpen( ! isOpen ) }
				type="button"
			>
				Columns{ hiddenCount > 0 ? ` (${ columns.length - hiddenCount }/${ columns.length })` : '' }
			</button>
			{ isOpen && (
				<div className="advdash__col-toggle-dropdown">
					{ columns.map( ( col ) => {
						const isPinned = pinnedColumns.includes( col.key );
						const isVisible = columnVisibility[ col.key ] !== false;

						return (
							<label
								key={ col.key }
								className={ `advdash__col-toggle-item${ isPinned ? ' advdash__col-toggle-item--pinned' : '' }` }
							>
								<input
									type="checkbox"
									checked={ isVisible }
									disabled={ isPinned }
									onChange={ () => handleToggle( col.key ) }
								/>
								{ col.label }
							</label>
						);
					} ) }
					{ hiddenCount > 0 && (
						<button
							className="advdash__col-toggle-reset"
							onClick={ handleReset }
							type="button"
						>
							Show all columns
						</button>
					) }
				</div>
			) }
		</div>
	);
}
