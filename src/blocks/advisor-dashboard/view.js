import { createRoot } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import App from './App';
import './style.css';

// Set up apiFetch nonce middleware for authenticated requests.
if ( window.advdashFrontend?.nonce ) {
	apiFetch.use( apiFetch.createNonceMiddleware( window.advdashFrontend.nonce ) );
}

const container = document.getElementById( 'advisor-dashboard-app' );
if ( container ) {
	createRoot( container ).render( <App /> );
}
