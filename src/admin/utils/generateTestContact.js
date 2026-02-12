const FIRST_NAMES = [
	'James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael',
	'Linda', 'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan',
	'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Christopher', 'Karen',
];

const LAST_NAMES = [
	'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
	'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez',
	'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
];

const CITIES = [
	'Washington', 'Arlington', 'Alexandria', 'Bethesda', 'Silver Spring',
	'Fairfax', 'Reston', 'McLean', 'Springfield', 'Annapolis',
];

const STATES = [ 'DC', 'VA', 'MD', 'PA', 'DE' ];

const AGENCIES = [
	'Department of Defense', 'Department of Veterans Affairs',
	'Department of Homeland Security', 'Department of the Treasury',
	'Department of Agriculture', 'Department of Commerce',
	'Social Security Administration', 'NASA', 'EPA', 'USPS',
];

const STREET_NAMES = [
	'Oak', 'Maple', 'Cedar', 'Pine', 'Elm', 'Washington', 'Jefferson',
	'Lincoln', 'Pennsylvania', 'Constitution',
];

const STREET_TYPES = [ 'St', 'Ave', 'Blvd', 'Dr', 'Ln', 'Ct' ];

const FOOD_OPTIONS = [ 'Chicken', 'Beef', 'Vegetarian', 'Fish', 'Pasta' ];
const SIDE_OPTIONS = [ 'Salad', 'Soup', 'Rice', 'Vegetables', 'Bread' ];

const RETIREMENT_SYSTEMS = [ 'FERS', 'CSRS', 'FERS-FRAE', 'CSRS Offset' ];
const RETIREMENT_TIMEFRAMES = [ '0-2 years', '3-5 years', '5-10 years', '10+ years' ];
const SPECIAL_PROVISIONS_LIST = [ 'Law Enforcement', 'Firefighter', 'Air Traffic Controller', 'None' ];
const RATINGS = [ 'Excellent', 'Good', 'Average', 'Poor' ];

const COMMENTS = [
	'Looking forward to the workshop',
	'Please send materials in advance',
	'Interested in retirement planning',
	'Referred by a colleague',
	'Would like a follow-up call',
	'First time attending',
	'Returning attendee',
];

const randomFrom = ( arr ) => arr[ Math.floor( Math.random() * arr.length ) ];
const randomInt = ( min, max ) => Math.floor( Math.random() * ( max - min + 1 ) ) + min;
const randomDigits = ( n ) => String( randomInt( 10 ** ( n - 1 ), 10 ** n - 1 ) );
const maybe = ( value, probability = 0.5 ) => Math.random() < probability ? value : '';

const formatDateYMD = ( date ) => {
	const y = date.getFullYear();
	const m = String( date.getMonth() + 1 ).padStart( 2, '0' );
	const d = String( date.getDate() ).padStart( 2, '0' );
	return `${ y }-${ m }-${ d }`;
};

const generateUpcomingDate = () => {
	const d = new Date();
	d.setDate( d.getDate() + randomInt( 7, 60 ) );
	return formatDateYMD( d );
};

const generateRecentPastDate = () => {
	const d = new Date();
	d.setDate( d.getDate() - randomInt( 1, 30 ) );
	return formatDateYMD( d );
};

const generateRecentDate = () => {
	const d = new Date();
	d.setDate( d.getDate() - randomInt( 0, 14 ) );
	return formatDateYMD( d );
};

const generateBaseContact = () => {
	const firstName = randomFrom( FIRST_NAMES );
	const lastName = randomFrom( LAST_NAMES );
	const domain = randomFrom( [ 'gmail.com', 'yahoo.com', 'outlook.com' ] );

	return {
		contact_id: `test-${ Date.now() }-${ Math.random().toString( 36 ).substr( 2, 6 ) }`,
		first_name: firstName,
		last_name: lastName,
		cell_phone: `(${ randomDigits( 3 ) }) ${ randomDigits( 3 ) }-${ randomDigits( 4 ) }`,
		work_email: `${ firstName.toLowerCase() }.${ lastName.toLowerCase() }@work.gov`,
		personal_email: `${ firstName.toLowerCase() }.${ lastName.toLowerCase() }${ randomDigits( 2 ) }@${ domain }`,
		home_address: `${ randomInt( 100, 9999 ) } ${ randomFrom( STREET_NAMES ) } ${ randomFrom( STREET_TYPES ) }`,
		city: randomFrom( CITIES ),
		state: randomFrom( STATES ),
		postal_code: randomDigits( 5 ),
	};
};

export default function generateTestContact( tabKey ) {
	const base = generateBaseContact();

	switch ( tabKey ) {
		case 'current_registrations':
			return {
				...base,
				workshop_date: generateUpcomingDate(),
				spouse_name: maybe( randomFrom( FIRST_NAMES ) ),
				food_option_fed: randomFrom( FOOD_OPTIONS ),
				side_option_fed: randomFrom( SIDE_OPTIONS ),
				food_option_spouse: maybe( randomFrom( FOOD_OPTIONS ) ),
				side_option_spouse: maybe( randomFrom( SIDE_OPTIONS ) ),
				rsvp_confirmed: randomFrom( [ 'Yes', 'No', 'Pending' ] ),
				special_provisions: maybe( randomFrom( SPECIAL_PROVISIONS_LIST ) ),
				retirement_system: randomFrom( RETIREMENT_SYSTEMS ),
				registration_form_completed: generateRecentDate(),
				comment_on_registration: maybe( randomFrom( COMMENTS ), 0.3 ),
				status: randomFrom( [ 'Registered', 'Confirmed', 'Pending' ] ),
			};

		case 'attended_report':
		case 'attended_other':
			return {
				...base,
				workshop_date: generateRecentPastDate(),
				spouse_name: maybe( randomFrom( FIRST_NAMES ) ),
				agency: randomFrom( AGENCIES ),
				retirement_system: randomFrom( RETIREMENT_SYSTEMS ),
				time_frame_for_retirement: randomFrom( RETIREMENT_TIMEFRAMES ),
				meet_for_report: randomFrom( [ 'Yes', 'No' ] ),
				rate_material: randomFrom( RATINGS ),
				best_email: base.work_email,
				additional_comments: maybe( randomFrom( COMMENTS ), 0.3 ),
			};

		case 'fed_request':
			return {
				...base,
				date_of_lead_request: generateRecentDate(),
				spouse_name: maybe( randomFrom( FIRST_NAMES ) ),
				agency: randomFrom( AGENCIES ),
				retirement_system: randomFrom( RETIREMENT_SYSTEMS ),
				special_provisions: maybe( randomFrom( SPECIAL_PROVISIONS_LIST ) ),
				time_frame_for_retirement: randomFrom( RETIREMENT_TIMEFRAMES ),
				meet_for_report: randomFrom( [ 'Yes', 'No' ] ),
				best_email: base.personal_email,
			};

		default:
			return base;
	}
}
