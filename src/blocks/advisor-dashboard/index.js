import { registerBlockType } from '@wordpress/blocks';
import Edit from './edit';

registerBlockType( 'advisor-dashboard/dashboard', {
	edit: Edit,
	save: () => null,
} );
