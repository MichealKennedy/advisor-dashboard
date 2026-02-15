import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { Placeholder, Icon, PanelBody, TextControl } from '@wordpress/components';
import { TAB_CONFIG } from '../../shared/utils';

export default function Edit( { attributes, setAttributes } ) {
	const blockProps = useBlockProps();
	const { customTabLabels = {} } = attributes;

	const updateTabLabel = ( tabKey, value ) => {
		setAttributes( {
			customTabLabels: {
				...customTabLabels,
				[ tabKey ]: value,
			},
		} );
	};

	return (
		<div { ...blockProps }>
			<InspectorControls>
				<PanelBody title="Tab Names" initialOpen={ true }>
					{ TAB_CONFIG.map( ( tab ) => (
						<TextControl
							key={ tab.key }
							label={ tab.label }
							value={ customTabLabels[ tab.key ] || '' }
							placeholder={ tab.label }
							onChange={ ( val ) =>
								updateTabLabel( tab.key, val )
							}
							help={
								customTabLabels[ tab.key ]
									? `Default: ${ tab.label }`
									: undefined
							}
						/>
					) ) }
				</PanelBody>
			</InspectorControls>
			<Placeholder
				icon={ <Icon icon="businessman" /> }
				label="Advisor Dashboard"
				instructions="This block displays the advisor's workshop dashboard. The content is personalized for each logged-in advisor and will appear on the published page."
			/>
		</div>
	);
}
