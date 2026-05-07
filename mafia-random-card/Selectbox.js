/* SELECTBOX COMPONENT */
class SelectBox extends React.Component {
    render() {
        return <FormBlock>
            <FormLabel>{this.props.label}</FormLabel>
                <FormSelect onChange={this.props.handleChange} value={this.props.val}>
                    {this.props.options.map((i) => <option key={i} value={i}>{i}</option>)}
                </FormSelect>
        </FormBlock>
    }
}