const {
    createStore,
    bindActionCreators
} = Redux;

const {
    Provider,
    connect
} = ReactRedux;

/*--- STORE ---*/

const store = createStore(reducer, data);

const AppContainer = connect(
    function mapStateToProps(state) {
        return state;
    },
    function mapDispatchToProps(dispatch) {
        return bindActionCreators(actions, dispatch);
    }
)(Main);

ReactDOM.render(
    <Provider store={store}>
        <AppContainer/>
    </Provider>, 
    document.getElementById('app')
);