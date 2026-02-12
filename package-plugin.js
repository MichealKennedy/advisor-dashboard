/**
 * Package the plugin into a distributable ZIP file.
 *
 * Usage: npm run package
 *
 * Produces: advisor-dashboard.zip in the project root,
 * containing only the files needed for a WordPress installation.
 */

const { execSync } = require( 'child_process' );
const fs = require( 'fs' );
const path = require( 'path' );
const { createWriteStream } = require( 'fs' );

// Check for archiver — fall back to PowerShell if not available.
let useArchiver = false;
try {
	require.resolve( 'archiver' );
	useArchiver = true;
} catch ( e ) {
	// archiver not installed; will use PowerShell.
}

const ROOT = __dirname;
const PLUGIN_SLUG = 'advisor-dashboard';
const ZIP_NAME = `${ PLUGIN_SLUG }.zip`;
const DIST_DIR = path.join( ROOT, 'dist', PLUGIN_SLUG );

// Files and directories to include in the ZIP.
const INCLUDE = [
	'advisor-dashboard.php',
	'uninstall.php',
	'readme.txt',
	'includes/',
	'admin/',
	'build/',
];

function clean() {
	const distParent = path.join( ROOT, 'dist' );
	if ( fs.existsSync( distParent ) ) {
		fs.rmSync( distParent, { recursive: true, force: true } );
	}
	const zipPath = path.join( ROOT, ZIP_NAME );
	if ( fs.existsSync( zipPath ) ) {
		fs.unlinkSync( zipPath );
	}
}

function copyRecursive( src, dest ) {
	const stat = fs.statSync( src );
	if ( stat.isDirectory() ) {
		fs.mkdirSync( dest, { recursive: true } );
		for ( const child of fs.readdirSync( src ) ) {
			copyRecursive( path.join( src, child ), path.join( dest, child ) );
		}
	} else {
		fs.copyFileSync( src, dest );
	}
}

function buildPlugin() {
	console.log( '1. Building plugin assets...' );
	execSync( 'npm run build', { cwd: ROOT, stdio: 'inherit' } );
}

function stageFiles() {
	console.log( '2. Staging production files...' );
	fs.mkdirSync( DIST_DIR, { recursive: true } );

	for ( const item of INCLUDE ) {
		const src = path.join( ROOT, item );
		const dest = path.join( DIST_DIR, item );

		if ( ! fs.existsSync( src ) ) {
			console.warn( `   Warning: ${ item } not found, skipping.` );
			continue;
		}

		copyRecursive( src, dest );
		console.log( `   Copied: ${ item }` );
	}
}

function createZip() {
	const zipPath = path.join( ROOT, ZIP_NAME );
	const distParent = path.join( ROOT, 'dist' );

	if ( useArchiver ) {
		console.log( '3. Creating ZIP with archiver...' );
		const archiver = require( 'archiver' );
		const output = createWriteStream( zipPath );
		const archive = archiver( 'zip', { zlib: { level: 9 } } );

		return new Promise( ( resolve, reject ) => {
			output.on( 'close', () => {
				const sizeKB = Math.round( archive.pointer() / 1024 );
				console.log( `\n   ${ ZIP_NAME } created (${ sizeKB } KB)` );
				resolve();
			} );
			archive.on( 'error', reject );
			archive.pipe( output );
			archive.directory( DIST_DIR, PLUGIN_SLUG );
			archive.finalize();
		} );
	}

	// Fallback: use PowerShell's Compress-Archive.
	// Use dist\* so the ZIP contains advisor-dashboard/ at root (not dist/advisor-dashboard/).
	console.log( '3. Creating ZIP with PowerShell...' );
	const distParentGlob = path.join( distParent, '*' );
	execSync(
		`powershell -Command "Compress-Archive -Path '${ distParentGlob }' -DestinationPath '${ zipPath }' -Force"`,
		{ stdio: 'inherit' }
	);

	const stats = fs.statSync( zipPath );
	const sizeKB = Math.round( stats.size / 1024 );
	console.log( `\n   ${ ZIP_NAME } created (${ sizeKB } KB)` );

	return Promise.resolve();
}

function cleanStaging() {
	console.log( '4. Cleaning up staging directory...' );
	fs.rmSync( path.join( ROOT, 'dist' ), { recursive: true, force: true } );
}

async function main() {
	console.log( `\nPackaging ${ PLUGIN_SLUG } v1.0.0\n${ '='.repeat( 40 ) }\n` );

	clean();
	buildPlugin();
	stageFiles();
	await createZip();
	cleanStaging();

	console.log( `\nDone! Upload ${ ZIP_NAME } to WordPress.\n` );
}

main().catch( ( err ) => {
	console.error( 'Packaging failed:', err.message );
	process.exit( 1 );
} );
