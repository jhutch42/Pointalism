const detector = new PointDetector();
const elements = [];

document.addEventListener('touchstart', (event) => {
    detector.update(event);
    event.preventDefault();
}, { passive: false });

document.addEventListener('touchmove', (event) => {
    results = detector.update(event);
    detector.evaluateTouchData(results, elements);
    event.preventDefault();
}, { passive: false });

document.addEventListener('touchend', (event) => {
    detector.update(event);
    detector.evaluateClickData(elements);
    event.preventDefault();
}, { passive: false });


document.getElementById('tri').addEventListener('touchstart', createTriangle);
document.getElementById('rect').addEventListener('touchstart', createRectangle);
document.getElementById('cir').addEventListener('touchstart', createCircle);
document.getElementById('line').addEventListener('touchstart', createLine);
document.getElementById('img').addEventListener('touchstart', createImage);

function createTriangle() {
    elements.push(new Triangle(DEFAULT_MIN, 20, 'green', 'absolute'));
}

function createRectangle() {
    elements.push(new Rectangle(DEFAULT_MIN, DEFAULT_MIN, 'red', 'absolute'));
}

function createCircle() {
    elements.push(new Circle(DEFAULT_MIN, 'blue', 'absolute'));
}

function createLine() {
    elements.push(new Line(DEFAULT_MIN, 4, 'orange', 'absolute'));

}
function createImage() {
    elements.push(new ImageElement(DEFAULT_MIN, DEFAULT_MIN, 'absolute', 'https://image.shutterstock.com/image-vector/cute-frog-cartoon-isolated-on-600w-747974962.jpg'));
}

