const inputElement = document.getElementById(`inputID`);
let expression = ``;

function add(value) {
    if (value === `.`) {

        const parts = expression.split(/[\+\-\*\/]/);
        const lastNumber = parts[parts.length - 1];

        if (lastNumber.includes(`.`))
            return;

        if (expression === `` || /[\+\-\*\/]$/.test(expression)) {
            expression += `0.`;
            updateDisplay();
            return;
        }
    }

    if (expression === `0` && value !== `.`) {
        expression = String(value);
    }
    else {
        expression += String(value);
    }
    updateDisplay();
}

function operacionFunction(operator) {
    if (expression === ``)
        return;

    const lastChar = expression.slice(-1);
    const operators = [`+`, `-`, `*`, `/`];

    if (operators.includes(lastChar)) {
        expression = expression.slice(0, -1) + operator;
    }
    else {
        expression += operator;
    }

    updateDisplay();
}

function igual() {
    if (!expression)
        return;

    try {
        let result = new Function(`return ` + expression)();
        if (!isFinite(result)) throw new Error();

        let finalResult = Number(result.toFixed(8));
        expression = String(finalResult);
        updateDisplay();
    }
    catch (err) {
        inputElement.value = `Error`;
        expression = ``;
    }
}

function cleanInput() {
    expression = ``;
    inputElement.value = ``;
    inputElement.placeholder = '0';
}

function inverso() {
    if (!expression)
        return;
    expression = expression.startsWith(`-`) ? expression.slice(1) : `-` + expression; 
    updateDisplay();
}

function porciento() {
    if (!expression)
        return;
    try {
        let current = new Function(`return ` + expression)();
        expression = String(current / 100);
        updateDisplay();
    }
    catch (e) {
        expression = ``;
        updateDisplay();
    }
}

function raiz() {
    if (!expression)
        return;
    try{
    let current = new Function(`return ` + expression)();
    expression = String(Math.sqrt(current));
    updateDisplay();
}
catch(e) {expression =`Error`;}
}

function pi() {
    if(expression !== ``&& !/[\+\-\*\/]$/.test(expression)){
    expression += `*`;
}
expression += String(Math.PI.toFixed(8));
updateDisplay();
}

function cuadrado() {
    if (!expression)
        return;
    try{
    let current = new Function(`return ` + expression)();
    expression = String(Math.pow(current, 2));
    updateDisplay();
}
catch(e) {expression = `Error`;}
}

function cubo() {
    if (!expression)
        return;
    try{
    let current = new Function(`return ` + expression)();
    expression = String(Math.pow(current, 3));
    updateDisplay();
}
catch(e) {expression = `Error`;}
}

function updateDisplay() {
    inputElement.value = expression;
}
