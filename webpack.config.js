const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );
const path = require( 'path' );

module.exports = {
	...defaultConfig,
	entry: {
		...defaultConfig.entry(),
		'admin/index': path.resolve( process.cwd(), 'src/admin', 'index.js' ),
	},
};
