class Calculadora {

    // CONSTRUCTOR
    constructor() {
        this.expresion = '';
        this.historial = '';
        this.valorActual = '0';
        this.parentesisAbiertos = 0;
        this.recienCalculado = false;
        this.enError = false;
        this.memoria = 0;
        this.enRadianes = true;
        this.modoSegundo = false;
        this.hayEntrada = false;
        this.operadorActivo = null;

        this.$historial = document.getElementById('expr');
        this.$valorActual = document.getElementById('main');
        this.$btnRad = document.getElementById('radBtn');
        this.$btn2nd = document.getElementById('btn2nd');
        this.$btnClear = document.querySelector('[data-a="clear"]');

        document.getElementById('calc')
            .addEventListener('click', e => {
                const btn = e.target.closest('[data-a]');
                if (btn) this._despachar(btn.dataset.a, btn.dataset.v);
            });
        document.addEventListener('keydown', e => this._teclado(e));

        // Iniciar con 2nd bloqueado (modo RAD por defecto)
        this._aplicarBloqueo2nd();
        this._actualizarBotonClear();
        this._renderizar();
    }

    // DESPACHADOR
    _despachar(accion, valor) {
        if (this.enError) this._resetEstado();

        switch (accion) {
            case 'dig': this.ingresarDigito(valor === ',' ? '.' : valor); break;
            case 'op': this.ingresarOperador(valor); break;
            case 'eq': this.ejecutar(); break;
            case 'clear': this.limpiar(); break;
            case 'sign': this.cambiarSigno(); break;
            case 'pct': this.porcentaje(); break;
            case 'paren': this.ingresarParentesis(valor); break;
            case 'mc': this.memoria = 0; break;
            case 'mplus': this.memoria += this._numActual(); break;
            case 'mminus': this.memoria -= this._numActual(); break;
            case 'mr': this._insertarValor(String(this.memoria)); break;
            // Prefijos con 2nd (solo activo en DEG)
            case 'sin': this._prefijo(this._esInverso() ? 'asin(' : 'sin('); break;
            case 'cos': this._prefijo(this._esInverso() ? 'acos(' : 'cos('); break;
            case 'tan': this._prefijo(this._esInverso() ? 'atan(' : 'tan('); break;
            case 'sinh': this._prefijo(this._esInverso() ? 'asinh(' : 'sinh('); break;
            case 'cosh': this._prefijo(this._esInverso() ? 'acosh(' : 'cosh('); break;
            case 'tanh': this._prefijo(this._esInverso() ? 'atanh(' : 'tanh('); break;
            // FIX 1: ln/log/sqrt/cbrt calculan inmediatamente si hay número en pantalla
            case 'ln': this._prefijoInmediato('ln(', x => Math.log(x)); break;
            case 'log': this._prefijoInmediato('log(', x => Math.log10(x)); break;
            case 'sqrt2': this._prefijoInmediato('sqrt(', x => Math.sqrt(x)); break;
            case 'sqrt3': this._prefijoInmediato('cbrt(', x => Math.cbrt(x)); break;
            case 'expE': this._prefijo('exp('); break;
            case 'sqrty': this._prefijo('nthRoot('); break;
            //10x es prefijo — pulsas la tecla, luego el exponente, luego =
            case 'pow10': this._prefijo('pow10('); break;
            case 'square': this._aplicarFn(x => Math.pow(x, 2), 'x2'); break;
            case 'cube': this._aplicarFn(x => Math.pow(x, 3), 'x3'); break;
            //reciproco muestra n^(-1) en historial
            case 'recip': this._reciproco(); break;
            //factorial con pantalla vacia calcula 0! = 1
            case 'fact': this._factorial(); break;
            case 'pow': this.ingresarOperador('**'); break;
            case 'eConst': this._insertarConstante(String(Math.E), 'e'); break;
            case 'pi': this._insertarConstante(String(Math.PI), 'pi'); break;
            case 'rand': this._insertarConstante(String(Math.random()), 'Rand'); break;
            //2nd solo disponible en modo DEG
            case 'second': if (!this.enRadianes) this._alternarSegundo(); break;
            case 'radDeg': this._alternarRadDeg(); break;
            //EE muestra la e en el display inferior inmediatamente
            case 'ee': this._ingresarEE(); break;
        }

        this._resaltarOp(accion, valor);
    }

    // INGRESAR DIGITO  0-9
    ingresarDigito(digito) {
        if (this.recienCalculado) {
            this.expresion = '';
            this.historial = '';
            this.recienCalculado = false;
            this._limpiarOpResaltado();
        }

        this.hayEntrada = true;
        this._actualizarBotonClear();

        if (digito === '.') {
            const seg = this._segmentoActual();
            if (seg.includes('.')) return;
            if (seg === '') this.expresion += '0';
        }

        const seg = this._segmentoActual();
        if (seg === '0' && digito !== '.') {
            this.expresion = this.expresion.slice(0, -1);
        }

        this.expresion += digito;
        this.valorActual = this._segmentoActual();
        this.historial = this._exprDisplay();
        this._renderizar();
    }

    // INGRESAR OPERADOR  + - * /  **
    ingresarOperador(op) {
        if (this.modoSegundo) this._alternarSegundo();

        if (this.expresion === '') {
            if (op === '-') {
                this.expresion = '-';
                this.valorActual = '0';
                this.historial = '-';
                this._renderizar();
            }
            return;
        }

        // Calculo automatico en cadena
        if (!this.recienCalculado && !/(\*\*|[+\-*/])$/.test(this.expresion)) {
            const tieneOp = /[+\-*/]/.test(this.expresion.replace(/^-/, ''));
            if (tieneOp) { 
                try {
                    let exprTemp = this.expresion;
                    let parAux = this.parentesisAbiertos;
                    while (parAux > 0) { exprTemp += ')'; parAux--; }
                    const resultado = this._evaluar(exprTemp);
                    const fmt = this._fmt(resultado);
                    this.historial = this._exprDisplay(exprTemp) + ' =';
                    this.expresion = fmt;
                    this.valorActual = this._fmtDisplay(resultado);
                    this.parentesisAbiertos = 0;
                    this._renderizar();
                } catch (_) { /* continua sin calcular si falla */ }
            }
        }

        this.recienCalculado = false;
        this.hayEntrada = false;
        this._actualizarBotonClear();

        if (/(\*\*|[+\-*/])$/.test(this.expresion)) {
            this.expresion = this.expresion.replace(/(\*\*|[+\-*/])$/, op);
        } else {
            this.expresion += op;
        }

        this.operadorActivo = op;
        this.historial = this._exprDisplay();
        this._renderizar();
    }

    // PREFIJO CIENTIFICO  sin(  cos(  sqrt(  ln(  ...
    _prefijo(prefijo) {
        this.recienCalculado = false;
        this.hayEntrada = true;
        this._actualizarBotonClear();

        if (this.expresion !== '' && /[\d.)]$/.test(this.expresion)) {
            this.expresion += '*';
        }

        this.expresion += prefijo;
        this.parentesisAbiertos++;

        this.valorActual = prefijo;
        this.historial = this._exprDisplay();
        this._renderizar();
    }

    // PREFIJO INMEDIATO  ln  log  sqrt  cbrt
    _prefijoInmediato(prefijo, fnCalc) {
        const seg = this._segmentoActual();
        const n = parseFloat(seg);

        if (seg !== '' && !isNaN(n)) {
            try {
                const r = fnCalc(n);
                if (!isFinite(r) || isNaN(r)) throw new Error();
                const fmt = this._fmt(r);
                const pos = this.expresion.lastIndexOf(seg);
                if (pos !== -1) {
                    this.expresion = this.expresion.slice(0, pos) + fmt
                        + this.expresion.slice(pos + seg.length);
                }
                const fnName = prefijo.replace('(', '');
                this.valorActual = this._fmtDisplay(r);
                this.historial = fnName + '(' + this._fmtCorto(n) + ') =';
                this.recienCalculado = true;
                this.hayEntrada = false;
                this._actualizarBotonClear();
                this._renderizar();
            } catch (_) {
                this._error('No definido');
            }
        } else {
            this._prefijo(prefijo);
        }
    }

    // RECIPROCO  1/x
    _reciproco() {
        const seg = this._segmentoActual();
        if (!seg) { this._error('Error'); return; }
        const n = parseFloat(seg);
        if (isNaN(n)) { this._error('Error'); return; }
        if (n === 0) { this._error('No definido'); return; }

        const r = 1 / n;
        const fmt = this._fmt(r);
        const pos = this.expresion.lastIndexOf(seg);
        if (pos !== -1) {
            this.expresion = this.expresion.slice(0, pos) + fmt
                + this.expresion.slice(pos + seg.length);
        }
        this.valorActual = this._fmtDisplay(r);
        this.historial = this._fmtCorto(n) + '^(-1) =';
        this._renderizar();
    }

    // PARENTESIS  ( )
    ingresarParentesis(p) {
        this.recienCalculado = false;
        this.hayEntrada = true;
        this._actualizarBotonClear();

        if (p === '(') {
            if (this.expresion !== '' && /[\d.)]$/.test(this.expresion)) {
                this.expresion += '*';
            }
            this.expresion += '(';
            this.parentesisAbiertos++;
        } else {
            if (this.parentesisAbiertos <= 0) return;
            this.expresion += ')';
            this.parentesisAbiertos--;
        }

        this.valorActual = this._segmentoActual() || p;
        this.historial = this._exprDisplay();
        this._renderizar();
    }

    // EJECUTAR  =
    ejecutar() {
        if (!this.expresion || this.expresion === '-') return;

        let expr = this.expresion;
        while (this.parentesisAbiertos > 0) { expr += ')'; this.parentesisAbiertos--; }
        expr = expr.replace(/(\*\*|[+\-*/])+$/, '');
        if (!expr) return;

        const historialFinal = this._exprDisplay(expr) + ' =';
        try {
            const resultado = this._evaluar(expr);
            const formateado = this._fmt(resultado);

            this.historial = historialFinal;
            this.valorActual = this._fmtDisplay(resultado);
            this.expresion = formateado;
            this.recienCalculado = true;
            this.hayEntrada = false;
            this.parentesisAbiertos = 0;
            this.operadorActivo = null;

            this._actualizarBotonClear();
            this._limpiarOpResaltado();
            this._renderizar();
        } catch (e) {
            this._error(e.message || 'Invalido');
        }
    }

    // LIMPIAR  AC / C
    limpiar() {
        if (this.hayEntrada && !this.recienCalculado) {
            const seg = this._segmentoActual();
            if (seg) {
                const pos = this.expresion.lastIndexOf(seg);
                if (pos !== -1) this.expresion = this.expresion.slice(0, pos);
            }
            this.valorActual = '0';
            this.hayEntrada = false;
            this.historial = this._exprDisplay();
            this._actualizarBotonClear();
            this._renderizar();
        } else {
            this.expresion = '';
            this.historial = '';
            this.valorActual = '0';
            this.parentesisAbiertos = 0;
            this.recienCalculado = false;
            this.hayEntrada = false;
            this.modoSegundo = false;
            this.operadorActivo = null;
            this.enError = false;
            if (this.$historial) this.$historial.textContent = '';
            if (this.$valorActual) this.$valorActual.textContent = '0';
            this._limpiarOpResaltado();
            this._limpiarSegundo();
            this._actualizarBotonClear();
            this._renderizar();
        }
    }

    // CAMBIAR SIGNO  +/-
    cambiarSigno() {
        const seg = this._segmentoActual();
        if (!seg) return;
        const n = parseFloat(seg);
        if (isNaN(n)) return;
        const negado = String(-n);
        const pos = this.expresion.lastIndexOf(seg);
        if (pos !== -1) {
            this.expresion = this.expresion.slice(0, pos) + negado
                + this.expresion.slice(pos + seg.length);
        }
        this.valorActual = negado;
        this.historial = this._exprDisplay();
        this._renderizar();
    }

    // PORCENTAJE  %
    porcentaje() {
        const seg = this._segmentoActual();
        if (!seg) return;
        const n = parseFloat(seg);
        if (isNaN(n)) return;

        const match = this.expresion.match(/^(-?[\d.]+)([+\-*/^*]+)(-?[\d.]*)$/);
        const res = match ? parseFloat(match[1]) * n / 100 : n / 100;

        const fmt = this._fmt(res);
        const pos = this.expresion.lastIndexOf(seg);
        if (pos !== -1) {
            this.expresion = this.expresion.slice(0, pos) + fmt
                + this.expresion.slice(pos + seg.length);
        }
        this.valorActual = this._fmtDisplay(res);
        this.historial = this._exprDisplay();
        this._renderizar();
    }

    // FUNCIONES INMEDIATAS  x2  x3
    _aplicarFn(fn, etiqueta) {
        const seg = this._segmentoActual();
        if (!seg) return;
        const n = parseFloat(seg);
        if (isNaN(n)) return;
        try {
            const r = fn(n);
            if (!isFinite(r) || isNaN(r)) throw new Error();
            const fmt = this._fmt(r);
            const pos = this.expresion.lastIndexOf(seg);
            if (pos !== -1) {
                this.expresion = this.expresion.slice(0, pos) + fmt
                    + this.expresion.slice(pos + seg.length);
            }
            this.valorActual = this._fmtDisplay(r);
            this.historial = etiqueta + '(' + this._fmtCorto(n) + ') =';
            this._renderizar();
        } catch (_) {
            this._error('No definido');
        }
    }

    // FACTORIAL  n!
    _factorial() {
        const seg = this._segmentoActual();
        const n = seg ? Math.round(parseFloat(seg)) : 0;

        if (n < 0 || n > 170) { this._error('Fuera de rango'); return; }
        let r = 1;
        for (let i = 2; i <= n; i++) r *= i;

        const fmt = this._fmt(r);
        if (!seg) {
            this.expresion = fmt;
        } else {
            const pos = this.expresion.lastIndexOf(seg);
            if (pos !== -1) {
                this.expresion = this.expresion.slice(0, pos) + fmt
                    + this.expresion.slice(pos + seg.length);
            }
        }
        this.valorActual = this._fmtDisplay(r);
        this.historial = n + '! =';
        this.recienCalculado = true;
        this.hayEntrada = false;
        this._actualizarBotonClear();
        this._renderizar();
    }

    // INSERTAR CONSTANTE  pi  e  Rand
    _insertarConstante(valor, etiqueta) {
        if (this.recienCalculado) {
            this.expresion = '';
            this.historial = '';
            this.recienCalculado = false;
            this._limpiarOpResaltado();
        }

        const seg = this._segmentoActual();
        if (seg && !isNaN(parseFloat(seg))) {
            const pos = this.expresion.lastIndexOf(seg);
            if (pos !== -1) {
                this.expresion = this.expresion.slice(0, pos) + valor
                    + this.expresion.slice(pos + seg.length);
            }
        } else if (this.expresion !== '' && /[\d.)]$/.test(this.expresion)) {
            this.expresion += '*' + valor;
        } else {
            this.expresion += valor;
        }

        this.hayEntrada = true;
        this._actualizarBotonClear();
        this.valorActual = etiqueta || valor;
        this.historial = this._exprDisplay();
        this._renderizar();
    }

    // INSERTAR VALOR LITERAL  (memoria recall mr)
    _insertarValor(valor) {
        if (this.recienCalculado) {
            this.expresion = '';
            this.recienCalculado = false;
            this._limpiarOpResaltado();
        }
        if (this.expresion !== '' && /[\d.)]$/.test(this.expresion)) {
            this.expresion += '*';
        }
        this.expresion += valor;
        this.hayEntrada = true;
        this._actualizarBotonClear();
        this.valorActual = this._fmtDisplay(parseFloat(valor));
        this.historial = this._exprDisplay();
        this._renderizar();
    }

    // NOTACION EE  (x10^)
    _ingresarEE() {
        const seg = this._segmentoActual();
        if (!seg || /e/.test(this.expresion)) return;
        this.expresion += 'e';
        this.hayEntrada = true;
        this._actualizarBotonClear();
        this.valorActual = seg + 'e';
        this.historial = this._exprDisplay();
        this._renderizar();
    }

    // RAD / DEG
    _alternarRadDeg() {
        this.enRadianes = !this.enRadianes;
        if (this.$btnRad) this.$btnRad.textContent = this.enRadianes ? 'Rad' : 'Deg';

        if (this.enRadianes && this.modoSegundo) {
            this.modoSegundo = false;
            this._limpiarSegundo();
        }
        this._aplicarBloqueo2nd();
    }

    _aplicarBloqueo2nd() {
        if (!this.$btn2nd) return;
        if (this.enRadianes) {
            this.$btn2nd.style.opacity = '0.35';
            this.$btn2nd.style.pointerEvents = 'none';
            this.$btn2nd.style.cursor = 'not-allowed';
        } else {
            this.$btn2nd.style.opacity = '1';
            this.$btn2nd.style.pointerEvents = '';
            this.$btn2nd.style.cursor = '';
        }
    }

    // 2nd  (funciones inversas - solo activo en DEG)
    _alternarSegundo() {
        this.modoSegundo = !this.modoSegundo;
        if (this.$btn2nd) this.$btn2nd.classList.toggle('act2nd', this.modoSegundo);
    }

    _esInverso() { return !this.enRadianes && this.modoSegundo; }

    // EVALUADOR INTERNO
    _evaluar(expr) {
        const rad = this.enRadianes;
        const toRad = rad ? 'x' : 'x*Math.PI/180';

        let e = expr
            .replace(/\bsin\(/g, '(x=>Math.sin(' + toRad + '))(')
            .replace(/\bcos\(/g, '(x=>Math.cos(' + toRad + '))(')
            .replace(/\btan\(/g, '(x=>Math.tan(' + toRad + '))(')
            .replace(/\bsinh\(/g, '(x=>Math.sinh(x))(')
            .replace(/\bcosh\(/g, '(x=>Math.cosh(x))(')
            .replace(/\btanh\(/g, '(x=>Math.tanh(x))(')
            .replace(/\basin\(/g, '(x=>(Math.asin(x)' + (rad ? '' : '*180/Math.PI') + '))(')
            .replace(/\bacos\(/g, '(x=>(Math.acos(x)' + (rad ? '' : '*180/Math.PI') + '))(')
            .replace(/\batan\(/g, '(x=>(Math.atan(x)' + (rad ? '' : '*180/Math.PI') + '))(')
            .replace(/\basinh\(/g, '(x=>Math.asinh(x))(')
            .replace(/\bacosh\(/g, '(x=>Math.acosh(x))(')
            .replace(/\batanh\(/g, '(x=>Math.atanh(x))(')
            .replace(/\bln\(/g, '(x=>Math.log(x))(')
            .replace(/\blog\(/g, '(x=>Math.log10(x))(')
            .replace(/\bsqrt\(/g, '(x=>Math.sqrt(x))(')
            .replace(/\bcbrt\(/g, '(x=>Math.cbrt(x))(')
            .replace(/\bexp\(/g, '(x=>Math.exp(x))(')
            .replace(/\bpow10\(/g, '(x=>Math.pow(10,x))(')
            .replace(/\bnthRoot\(/g, '((a,n)=>Math.pow(a,1/n))(');

        try {
            // eslint-disable-next-line no-new-func
            const fn = new Function('"use strict"; return (' + e + ')');
            const resultado = fn();
            if (!isFinite(resultado) || isNaN(resultado)) throw new Error('Resultado no valido');
            return resultado;
        } catch (_) {
            throw new Error('Error');
        }
    }

    // TECLADO
    _teclado(ev) {
        if (this.enError) this._resetEstado();
        const k = ev.key;
        if (k >= '0' && k <= '9') { this.ingresarDigito(k); return; }
        if (k === '.' || k === ',') { this.ingresarDigito('.'); return; }
        if (k === '+') { this.ingresarOperador('+'); return; }
        if (k === '-') { this.ingresarOperador('-'); return; }
        if (k === '*') { this.ingresarOperador('*'); return; }
        if (k === '/') { ev.preventDefault(); this.ingresarOperador('/'); return; }
        if (k === '^') { this.ingresarOperador('**'); return; }
        if (k === 'Enter' || k === '=') { ev.preventDefault(); this.ejecutar(); return; }
        if (k === 'Escape') { this.limpiar(); return; }
        if (k === '%') { this.porcentaje(); return; }
        if (k === 'Backspace') { this._borrarUltimo(); return; }
        if (k === '(') { this.ingresarParentesis('('); return; }
        if (k === ')') { this.ingresarParentesis(')'); return; }
    }

    _borrarUltimo() {
        if (this.recienCalculado) return;
        if (!this.expresion) return;
        const ult = this.expresion.slice(-1);
        if (ult === '(') this.parentesisAbiertos = Math.max(0, this.parentesisAbiertos - 1);
        if (ult === ')') this.parentesisAbiertos++;
        this.expresion = this.expresion.slice(0, -1);
        this.valorActual = this._segmentoActual() || '0';
        this.historial = this._exprDisplay();
        this._renderizar();
    }

    // HELPERS
    _segmentoActual() {
        const partes = this.expresion.split(/[+*/^(]+/);
        return partes[partes.length - 1] || '';
    }

    _numActual() { return parseFloat(this._segmentoActual()) || 0; }

    _exprDisplay(expr) {
        return (expr || this.expresion)
            .replace(/\*\*/g, '^')
            .replace(/\*/g, 'x')
            .replace(/\//g, '/');
    }

    _fmtDisplay(n) {
        if (!isFinite(n) || isNaN(n)) return 'Error';
        if (Math.abs(n) >= 1e15 || (Math.abs(n) < 1e-9 && n !== 0)) {
            const expStr = n.toExponential(6);
            return expStr.replace(/e([+-])(\d+)$/, function (_, sign, pow) {
                var sup = {
                    '0': '\u2070', '1': '\u00B9', '2': '\u00B2', '3': '\u00B3', '4': '\u2074',
                    '5': '\u2075', '6': '\u2076', '7': '\u2077', '8': '\u2078', '9': '\u2079'
                };
                var exp2 = (sign === '-' ? '\u207B' : '') + pow.split('').map(function (d) { return sup[d]; }).join('');
                return '\u00D710' + exp2;
            });
        }
        const raw = parseFloat(n.toFixed(10));
        const parts = raw.toString().split('.');
        const intFmt = Number(parts[0]).toLocaleString('es-ES');
        return parts[1] ? intFmt + ',' + parts[1] : intFmt;
    }

    _fmt(n) {
        if (!isFinite(n) || isNaN(n)) throw new Error('Resultado no valido');
        if (Math.abs(n) >= 1e15 || (Math.abs(n) < 1e-9 && n !== 0)) return n.toExponential(6);
        return parseFloat(n.toFixed(10)).toString();
    }

    _fmtCorto(n) { return parseFloat(Number(n).toFixed(6)).toString(); }

    _renderizar() {
        if (this.$historial) this.$historial.textContent = this.historial;
        if (this.$valorActual) {
            const display = this.valorActual || '0';
            this.$valorActual.textContent = display;
            const len = display.replace(/[^0-9]/g, '').length;
            this.$valorActual.classList.remove('f2', 'f3', 'f4');
            if (len > 15) this.$valorActual.classList.add('f4');
            else if (len > 11) this.$valorActual.classList.add('f3');
            else if (len > 7) this.$valorActual.classList.add('f2');
        }
    }

    _error(msg) {
        this.enError = true;
        if (this.$valorActual) this.$valorActual.textContent = msg;
        if (this.$historial) this.$historial.textContent = '';
        this.expresion = '';
        this.parentesisAbiertos = 0;
        this.valorActual = '0';
        this.historial = '';
        this.hayEntrada = false;
        this._actualizarBotonClear();
    }

    _resetEstado() {
        this.enError = false;
        this.valorActual = '0';
        this._renderizar();
    }

    _actualizarBotonClear() {
        if (this.$btnClear) {
            this.$btnClear.textContent = this.hayEntrada && !this.recienCalculado ? 'C' : 'AC';
        }
    }

    _resaltarOp(accion, valor) {
        this._limpiarOpResaltado();
        if (accion === 'op') {
            document.querySelectorAll('.o[data-a="op"]').forEach(function (b) {
                if (b.dataset.v === valor) b.classList.add('aop');
            });
        }
    }

    _limpiarOpResaltado() {
        document.querySelectorAll('.aop').forEach(function (b) { b.classList.remove('aop'); });
    }

    _limpiarSegundo() {
        document.querySelectorAll('.act2nd').forEach(function (b) { b.classList.remove('act2nd'); });
    }
}

// TOGGLE LANDSCAPE / PORTRAIT
var calcEl = document.getElementById('calc');
var toggleBtn = document.getElementById('toggleBtn');
var modoLandscape = false;

function aplicarModo() {
    if (modoLandscape) {
        calcEl.classList.add('landscape');
        toggleBtn.textContent = 'Portrait';
        document.querySelectorAll('.btn').forEach(function (b) {
            b.style.width = '52px'; b.style.height = '52px'; b.style.fontSize = '20px';
        });
        document.querySelectorAll('.s').forEach(function (b) {
            b.style.width = '48px'; b.style.height = '48px';
        });
        var cero = document.querySelector('.zero');
        if (cero) { cero.style.height = '52px'; cero.style.width = ''; cero.style.paddingLeft = '18px'; }
    } else {
        calcEl.classList.remove('landscape');
        toggleBtn.textContent = 'Landscape';
        document.querySelectorAll('.btn, .s').forEach(function (b) {
            b.style.width = ''; b.style.height = ''; b.style.fontSize = '';
        });
        var cero = document.querySelector('.zero');
        if (cero) { cero.style.height = ''; cero.style.paddingLeft = ''; }
    }
}

toggleBtn.addEventListener('click', function () {
    modoLandscape = !modoLandscape;
    aplicarModo();
});

window.addEventListener('orientationchange', function () {
    setTimeout(function () {
        modoLandscape = window.innerWidth > window.innerHeight;
        aplicarModo();
    }, 150);
});

document.addEventListener('DOMContentLoaded', function () {
    window.calculadora = new Calculadora();
    var esDispositivo = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    if (esDispositivo && window.innerWidth > window.innerHeight) {
        modoLandscape = true;
        aplicarModo();
    }
});


