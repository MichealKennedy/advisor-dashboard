<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class AdvDash_Deactivator {

	public static function deactivate() {
		flush_rewrite_rules();
		wp_clear_scheduled_hook( 'advdash_daily_log_cleanup' );
	}
}
