const detector = new PointDetector();
const elements = [];

document.addEventListener('touchstart', (event) => {
    results = detector.update(event);
    detector.checkFocus(results, elements);
    event.preventDefault();
}, { passive: false });

document.addEventListener('touchmove', (event) => {
    results = detector.update(event);
    detector.evaluateTouchData(results, elements);
    detector.checkFocus(results, elements);
    event.preventDefault();
}, { passive: false });

document.addEventListener('touchend', (event) => {
    results = detector.update(event);
    detector.evaluateClickData(elements);
    detector.checkFocus(results, elements);
    event.preventDefault();
}, { passive: false });


document.getElementById('tri').addEventListener('touchstart', createTriangle);
document.getElementById('rect').addEventListener('touchstart', createRectangle);
document.getElementById('cir').addEventListener('touchstart', createCircle);
document.getElementById('line').addEventListener('touchstart', createLine);
document.getElementById('img').addEventListener('touchstart', createImage);

function createTriangle() {
    const e = new Triangle(DEFAULT_MIN, 20, 'green', 'absolute');
    e.allowDrag().allowThrow().allowRotate().allowZoom();
    elements.push(e);
}

function createRectangle() {
    const e = new Rectangle(DEFAULT_MIN, DEFAULT_MIN, 'red', 'absolute');
    e.allowDrag().allowThrow().allowRotate().allowZoom();
    elements.push(e);
}

function createCircle() {
    const e = new Circle(DEFAULT_MIN, 'blue', 'absolute');
    e.allowDrag().allowThrow().allowZoom();
    elements.push(e);
}

function createLine() {
    const e = new Line(DEFAULT_MIN, 4, 'orange', 'absolute');
    e.allowDrag().allowRotate().allowZoom();
    elements.push(e);

}
function createImage() {
    const e = new ImageElement(DEFAULT_MIN, DEFAULT_MIN, 'absolute', 'https://image.shutterstock.com/image-vector/cute-frog-cartoon-isolated-on-600w-747974962.jpg');
    e.allowDrag().allowThrow().allowRotate().allowZoom();
    elements.push(e);
}

function createMenu() {
    const e = new SquareMenu(100, 100, 'absolute', 100, 1000);
    e.allowDrag().allowThrow().allowRotate().allowZoom();
    elements.push(e);
    //e.element.setBorder(1, 'black');
    e.addButton('Square');
    e.addButton('Frog');
    e.addButton('Circle');
    
}

