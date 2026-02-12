import { useBlockProps } from '@wordpress/block-editor';
import { Placeholder, Icon } from '@wordpress/components';

export default function Edit() {
	const blockProps = useBlockProps();

	return (
		<div { ...blockProps }>
			<Placeholder
				icon={ <Icon icon="businessman" /> }
				label="Advisor Dashboard"
				instructions="This block displays the advisor's workshop dashboard. The content is personalized for each logged-in advisor and will appear on the published page."
			/>
		</div>
	);
}
