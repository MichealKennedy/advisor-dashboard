import { createRoot } from '@wordpress/element';
import App from './App';
import './admin.css';

const container = document.getElementById( 'advisor-dashboard-admin' );
if ( container ) {
	createRoot( container ).render( <App /> );
}
