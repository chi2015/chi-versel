/* -- COMPONENTS --*/

class Main extends React.Component {
    constructor(props) {
        super(props);
        props.generateSelArr();
        if (!localStorage.getItem("random-card-data")) {
            props.changePlayersCount(props.count);
        }
        this.onUnload = this.onUnload.bind(this);
    }

    onUnload(event) { // the method that will be used for both add and remove event
        localStorage.setItem('random-card-data', JSON.stringify(this.props));
    }

    componentDidMount() {
        let isOnIOS = navigator.userAgent.match(/iPad/i)|| navigator.userAgent.match(/iPhone/i);
        let eventName = isOnIOS ? "pagehide" : "beforeunload";
        window.addEventListener(eventName, this.onUnload);

        var image = document.createElement('img');
            image.src = './cards_sprite.png';
            image.onload = function () {
                document.getElementById("loading").style.display = "none";
                document.getElementById("app").style.display = "block";
            };
    }

    componentWillUnmount() {
        let isOnIOS = navigator.userAgent.match(/iPad/i)|| navigator.userAgent.match(/iPhone/i);
        let eventName = isOnIOS ? "pagehide" : "beforeunload";
        window.removeEventListener(eventName, this.onUnload);
    }
    
    handleChangeCount(e) {
        this.props.changePlayersCount(parseInt(e.target.value));
    }

    handleChangeMafiaCount(e) {
        this.props.changeMafiaCount(parseInt(e.target.value));
    }

    handleKamChange(e) { 
        this.props.changeExtraCards('kam', e.target.checked);
    }

    handleShChange(e) {
        this.props.changeExtraCards('sh', e.target.checked);
    }

    handlePutChange(e) {
        this.props.changeExtraCards('p', e.target.checked);
    }

    handleDonChange(e) {
        this.props.changeExtraCards('don', e.target.checked);
    }

    render() {

        let mainBody = '';
        let mainTitle = '';
        
        if (this.props.mode == 'init') {
            mainTitle = 'Параметры игры для раздачи карт:';
            mainBody = <MainBody>
            <MainForm>
                <SelectBox label="Количество игроков:" 
                           handleChange={this.handleChangeCount.bind(this)}
                           val={this.props.count}
                           options={this.props.selArr}/>
                <SelectBox label="Количество мафий:" 
                           handleChange={this.handleChangeMafiaCount.bind(this)}
                           val={this.props.mafiaCount}
                           options={this.props.mafiaSelArr}/>
                <CheckBox label="Камикадзе:" 
                  showCondition={this.props.count >= 10 && this.props.mafiaCount >= 3} 
                  val={this.props.extraCards.kam}
                  defaultVal={this.props.extraCards.kam}
                  handleChange={this.handleKamChange.bind(this)}></CheckBox>
                <CheckBox label="Шахид:" 
                  showCondition={this.props.count >= 13 && this.props.mafiaCount >= 4} 
                  val={this.props.extraCards.sh}
                  defaultVal={this.props.extraCards.sh}
                  handleChange={this.handleShChange.bind(this)}></CheckBox>
                <CheckBox label="Путана:" 
                  showCondition={this.props.count >= 11} 
                  val={this.props.extraCards.p}
                  defaultVal={this.props.extraCards.p}
                  handleChange={this.handlePutChange.bind(this)}></CheckBox>
                <CheckBox label="Дон:" 
                  showCondition={this.props.count >= 9} 
                  val={this.props.extraCards.don}
                  defaultVal={this.props.extraCards.don}
                  handleChange={this.handleDonChange.bind(this)}></CheckBox>
            </MainForm>
            <FormButton primary onClick={this.props.startGenerate}>Начать раздачу</FormButton>
        </MainBody>;
        }

        if (this.props.mode == 'normal' || this.props.mode == 'generated') {
            let currentPlayer = this.props.current + 1;
            let btn = this.props.mode == 'normal' ?
            <FormButton primary onClick={this.props.generateCard}>Выдать</FormButton> :
            <FormButton warning onClick={this.props.nextPlayer}>{this.props.current < this.props.count - 1 ? 'Следующий' : 'OK'}</FormButton>;
            mainTitle = 'Карта игрока №'+currentPlayer;
            let generatedCard = '';
            if (this.props.mode == 'generated') {
                let cardValue = this.props.players[this.props.current];
                generatedCard = cardValue!="" ? <CardNew cardType={cardValue}/> : <CardNew/>;
            }
            mainBody = <MainBody>
            <CardContainer>{generatedCard}</CardContainer>
            {btn}
            <FormButton warning onClick={this.props.resetAll}>Начать заново</FormButton>
            </MainBody>;

        }

        if (this.props.mode == 'finished') {
            mainTitle = 'Все карты выданы';
            mainBody = <MainBody>
                <FormButton info onClick={this.props.getResult}>Смотреть результат</FormButton>
            </MainBody>
        }

        if (this.props.mode == 'result') {
            mainTitle = 'Результат';
            mainBody = <MainBody>
               <ResTable>
                {this.props.players.map((player, i) => 
                    <ResTableRow key={i}>
                        <ResTableCell>{i+1}</ResTableCell>
                        <ResTableCell>{player}</ResTableCell>
                    </ResTableRow>)}
               </ResTable>
            <FormButton warning onClick={this.props.resetAll}>Начать заново</FormButton>
            </MainBody>
        }
        let param = {primary : true};
        return <MainBlock>
            <MainTitle>{mainTitle}</MainTitle>
            {mainBody}
        </MainBlock>;
    }
}