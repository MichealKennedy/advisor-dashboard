<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class AdvDash_Deactivator {

	public static function deactivate() {
		flush_rewrite_rules();
	}
}
