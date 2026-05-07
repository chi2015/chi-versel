const MainBlock = styled.default.div`
display: flex;
flex-direction: column;
margin: 0 auto;
justify-content: flex-start;
align-items: center;
max-width: 320px;
min-height: 568px;
padding: 15px;
font-family: 'Arial';
font-size: 18px;
background-color: white;
`;

const MainBody = styled.default.div`
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
`;

const MainForm = styled.default.div`
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
`;

const MainTitle = styled.default.h1`
font-size:24px;
text-align: center;
`;

const FormBlock = styled.default.div`
display: flex;
flex-direction: row;
justify-content: center;
align-items: center;
width:100%;
margin: 5px 0;
`;

const FormLabel = styled.default.div`
font-size: 16px;
margin-right: 10px;
text-align: left;
width: 60%;
`;

const FormSelect = styled.default.select`
width: 100px;
height: 40px;
font-size: 18px;
`;

const FormCheckbox = styled.default.input.attrs({
    type : 'checkbox'
})`
width: 100px;
height: 30px;
`;

const FormButton = styled.default.button`
width: 200px;
height: 60px;
font-size: 20px;
border-radius: 10px;
outline: none;
margin: 20px 0;
${props => props.primary && styled.css`
background: linear-gradient(to bottom, #ff9933, #cccc00);`}
${props => props.warning && styled.css`
background: linear-gradient(to bottom, #ff0000, #ff9999);`}
${props => props.info && styled.css`
background: linear-gradient(to bottom, #66ffcc, #66ff33);`}
`;

const CardContainer = styled.default.div`
    height: 380px;
`;

const ResTable = styled.default.div`
display: flex;
flex-direction: column;
width: 160px;
`;

const ResTableRow = styled.default.div`
display: flex;
flex-direction: row;
height: 40px;
`;

const ResTableCell = styled.default.div`
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
border: 2px #000000 solid;
font-size: 18px;
width: 50%;
height: 100%;
`;


const Button = styled.default.button`
border-radius: 3px;
padding: 0.25em 1em;
margin: 1em;
background: transparent;
color: palevioletred;
border: 2px solid palevioletred;

${props => props.primary && styled.css`
  background: palevioletred;
  color: white;
`}
`;

const Card = styled.default.div`
width: 252px;
height: 380px;
border-radius: 25px;
background: url('./cards_sprite.png') ${props => props.cardType ? getBackgroundPosition(props.cardType) : '-554px -10px' };
`;

let getBackgroundPosition = (type) => {
    switch (type) {
        case 'm': return '-10px -10px';
        case 'man': return '-826px -10px';
        case 'd': return '-10px -410px';
        case 'k': return '-282px -10px';
        case 'kam': return '-1098px -10px';
        case 'sh': return '-826px -410px';
        case 'p': return '-282px -410px;';
        case 'don': return '-554px -410px';
    }

    return '-554px -10px';
};

const CardNew = styled.default.div`
width: 267px;
height: 380px;
border-radius: 25px;
background: url('./cards_sprite_new.png') ${props => props.cardType ? getBackgroundPositionNew(props.cardType) : '-874px -410px' };
`;

let getBackgroundPositionNew = (type) => {
    switch (type) {
        case 'm': return '-874px -10px';
        case 'man': return '-10px -10px';
        case 'd': return '-300px -10px';
        case 'k': return '-587px -10px';
        case 'kam': return '-1161px -10px';
        case 'sh': return '-584px -410px';
        case 'p': return '-297px -410px';
        case 'don': return '-10px -410px';
    }

    return '-874px -410px';
};