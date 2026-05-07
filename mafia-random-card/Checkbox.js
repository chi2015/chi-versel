/* CHECKBOX COMPONENT */
class CheckBox extends React.Component {
    render() {
        return this.props.showCondition ?
        <FormBlock>
            <FormLabel>{this.props.label}</FormLabel> 
            <FormCheckbox value={this.props.val} defaultChecked={this.props.defaultVal} onChange={this.props.handleChange}></FormCheckbox>
        </FormBlock> : '';
    }
}