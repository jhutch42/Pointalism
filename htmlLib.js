const DEFAULT_MAX = 500;
const DEFAULT_MIN = 150;

class Element {
    constructor(type) {
        this.element = document.createElement(type);
        this.animations = {
            rotation: {},
            slide: {}
        }
        return this;
    }

    findById(id) {
        return document.getElementById(id);
    }

    appendToParentId(element, parentId) {
        this.findById(parentId).appendChild(element);
        return element;
    }

    appendToParentElement(parent) {
        parent.appendChild(this.element);
        return this;
    }

    setWidthPx(width) {
        this.element.style.width = `${width}px`;
        return this;
    }

    setHeightPx(height) {
        this.element.style.height = `${height}px`;
        return this;
    }

    setClass(className) {
        this.element.className = className;
        return this;
    }

    appendToBody() {
        document.getElementsByTagName('BODY')[0].appendChild(this.element);
        return this;
    }

    setBackgroundColor(color) {
        this.element.style.backgroundColor = color;
        return this;
    }

    setPosition(position) {
        this.element.style.position = position;
        return this;
    }

    setLeft(left) {
        this.element.style.left = `${left}px`;
        return this;
    }

    setTop(top) {
        this.element.style.top = `${top}px`;
        return this;
    }

    setBorderRadius(radius) {
        this.element.style.borderRadius = radius;
        return this;
    }

    setBorder(thickness, color) {
        this.element.style.border = `${thickness}px solid ${color}`;
        return this;
    }

    setBorderLeft(thickness, color) {
        this.element.style.borderLeft = `${thickness}px solid ${color}`;
        return this;
    }

    setBorderTop(thickness, color) {
        this.element.style.borderTop = `${thickness}px solid ${color}`;
        return this;
    }

    setBorderRight(thickness, color) {
        this.element.style.borderRight = `${thickness}px solid ${color}`;
        return this;
    }

    setBorderBottom(thickness, color) {
        this.element.style.borderBottom = `${thickness}px solid ${color}`;
        return this;
    }


    setSource(src) {
        this.element.src = src;
        return this;
    }

    rotate(degrees) {
        this.element.style.transformOrigin = 'center center';
        this.element.style.transform = `rotate(${degrees % 360}deg)`;
        return this;
    }

    getX() {
        return this.element.offsetLeft;
    }

    getY() {
        return this.element.offsetTop;
    }

    getWidth() {
        return this.element.offsetWidth;
    }

    getHeight() {
        return this.element.offsetHeight;
    }

    
    setTransition(property, time) {
        this.element.style.transition = 'top 1s linear, left 1s linear';
        return this;
    }

    slideToEdge(points, speed, data) {

        const theta = TR.getAdjustedTheta(data.theta, data.quadrant)
        let x_step = TR.getAdjacentWithThetaAndHypotenuse(speed * 4, theta);
        let y_step = TR.getOppositeWithThetaAndHypotenuse(speed * 4, theta);

        if (data.quadrant === 2 || data.quadrant === 3) {
            x_step *= -1;
        }

        if (data.quadrant === 1 || data.quadrant === 2) {
            y_step *= -1;
        }

        const interval = setInterval(() => {

            if ( 
                (this.getX() + x_step) <= 0 || 
                (this.getX() + x_step) > window.innerWidth - this.getWidth() ||
                (this.getY() + y_step) <= 0 || 
                (this.getY() + y_step) > window.innerHeight - this.getHeight()) {
                    clearInterval(interval);

            }
            this.setLeft(this.getX() + x_step);
            this.setTop(this.getY() + y_step);
        }, 1);

        
    }

    slideToPoint(x, y, time) {
        const current_x = this.getX();
        const current_y = this.getY();
        const total_x_distance = x - current_x;
        const total_y_distance = y - current_y;

        const x_step = total_x_distance / time;
        const y_step = total_y_distance / time;

        const interval = setInterval(() => {
                this.setLeft(this.getX() + x_step);
                this.setTop(this.getY() + y_step);
            }, 1);

        setTimeout(() => {
            clearInterval(interval);
        }, time);
    }

    rotationAnimation(speed, duration, reverse) {
        let rotationValue = 0;
        let degreeChange = 1;

        if (reverse) {
            degreeChange *= -1;
        }

        let delay;

        switch (speed) {
            case 'very slow':
                delay = 100;
                break;
            case 'slow':
                delay = 50;
                break;
            case 'average':
                delay = 35;
                break;
            case 'fast':
                delay = 10;
                break;
            case 'very fast':
                delay = 2;
                break;
            default:
                delay = 0;
                break;
        }

        this.animations.rotation = {
            interval: setInterval(() => {
                rotationValue += degreeChange;
                this.rotate(rotationValue);
            }, delay),
            duration: duration
        }



        return this;
    }
}

class HTMLElement {
    constructor(type, min, max) {
        this.element = new Element(type);

        if (!min) {
            min = DEFAULT_MIN;
        }

        if (!max) {
            max = DEFAULT_MAX;
        }

        this.minSize = min;
        this.maxSize = max;
        this.rotation = 0;
    }


    reposition(left, top) {
        this.element.setLeft(left).setTop(top);
        return this;
    }

    repositionCenter(left, top) {
        const corners = this.element.element.getBoundingClientRect();
        this.element.setLeft(left - corners.width / 2).setTop(top - corners.width / 2);
        return this;
    }

    isInside(x, y) {
        const right = this.getX() + this.getWidth();
        const bottom = this.getY() + this.getHeight();
        const corners = {
            left: this.getX(),
            right: right,
            top: this.getY(),
            bottom: bottom
        }

        if (x > corners.left && x < corners.right && y > corners.top && y < corners.bottom) {
            return true;
        } else {
            return false;
        }
    }

    zoom(zoomValue) {

        const newWidth = this.getWidth() + zoomValue;
        const newHeight = this.getHeight() + zoomValue;

        if (newWidth > this.minSize && newWidth < this.maxSize && newHeight > this.minSize && newHeight < this.maxSize) {
            this.element.setWidthPx(newWidth).setHeightPx(newHeight);
            this.reposition(this.getX() - zoomValue / 2, this.getY() - zoomValue / 2);
        }
        return this;
    }
    
    throw(throwData) {
        const speed = throwData.distance / throwData.time; // pixels per millisecond
        const data = this.getThrowHistory(throwData.start, throwData.finish);
        const endPoints = this.getEndPoints(data);
        this.element.slideToEdge(endPoints, speed, data);
    }

    getEndPoints(data) {
        let x_edge = window.innerWidth;
        let y_edge = 0;

        switch (data.quadrant) {
            case 2:
                x_edge = 0;
                y_edge = 0;
                break;
            case 3:
                x_edge = 0;
                y_edge = window.innerHeight;
                break;
            case 4:
                x_edge = window.innerWidth;
                y_edge = window.innerHeight;
                break;
            default:
            // Already set.
        }

        return {x: x_edge, y: y_edge};
    }

    getThrowHistory(start, finish) {
        const x = TR.getSideLength(start.x, finish.x);
        const y = TR.getSideLength(start.y, finish.y);
        const z = TR.getHypotenuse(x, y);
        const quadrant = TR.getQuadrant(start, finish);
        const theta = TR.getTheta(x, y, quadrant);
        return {x: x, y: y, z: z, theta: theta, quadrant: quadrant};
    }

    checkDrag(point) {
        if (this.isInside(point.x, point.y) && point.isUnoccupied()) {
            point.dragging = true;
            point.interactionElement = this;
        }
    }

    checkZoom(point1, point2) {
        if (this.isInside(point1.x, point1.y) && this.isInside(point2.x, point2.y)) {
            point1.zooming = true;
            point2.zooming = true;
            point1.interactionElement = this;
            point2.interactionElement = this;
            point1.startZooming();
            point2.startZooming();
            return true;
        }
        return false;
    }

    checkRotation(cluster) {
        const point1 = cluster.points[0];
        const point2 = cluster.points[1];

        if ((this.isInside(point1.x, point1.y) || this.isInside(point2.x, point2.y)) && cluster.edges[0].weight < ROTATION_SEPARATION_MAX) {
            if (Math.abs(TR.getRotationSum(point1.positionHistory, point2.positionHistory)) > 2) {
                point1.interactionElement = this;
                point2.interactionElement = this;
                point1.startRotating();
                point2.startRotating();
                return true;
            }
        }
        return false;
    }

    getWidth() {
        return this.element.element.offsetWidth;
    }

    getHeight() {
        return this.element.element.offsetHeight;
    }

    getX() {
        return this.element.element.offsetLeft;
    }

    getY() {
        return this.element.element.offsetTop;
    }

    getNearestEdge() {

        const x_edge = window.innerWidth / 2 > this.getX() ? 0 : window.innerWidth;
        const y_edge = window.innerHeight / 2 > this.getY() ? 0 : window.innerHeight;

        return {x: x_edge, y: y_edge};
    }

}

class TouchMenu extends HTMLElement {
    constructor(width, height, position, min, max) {
        super('div', min, max);
        this.element.appendToBody().setWidthPx(width).setHeightPx(height).setPosition(position);
        return this;
    }
}

class ImageElement extends HTMLElement {
    constructor(width, height, position, src, min, max) {
        super('img', min, max);
        this.element.appendToBody().setWidthPx(width).setHeightPx(height).setPosition(position).setSource(src);
    }
}

class Shape extends HTMLElement {
    constructor(width, height, color, position, min, max) {
        super('div', min, max);
        this.element.appendToBody().setWidthPx(width).setHeightPx(height).setBackgroundColor(color).setPosition(position);
        return this;
    }

}

class Rectangle extends Shape {
    constructor(width, height, color, position, min, max) {
        super(width, height, color, position, min, max);
        return this;
    }

}

class Circle extends Shape {
    constructor(radius, color, position, min, max) {
        super(radius, radius, color, position, min, max)
        this.element.setBorderRadius('50%').slideToPoint(500, 1000, 500);
        return this;
    }
}

class Triangle extends Shape {
    constructor(width, height, color, position, min, max) {
        super(0, 0, color, position, min, max);
        this.element.setBackgroundColor('transparent').setBorderTop(width, color).setBorderLeft(width, 'transparent').setBorderBottom(width, 'transparent');
        return this;
    }
}

class Line extends Shape {
    constructor(width, height, color, position, min, max) {
        super(width, 0, 'transparent', position, min, max);
        this.element.setBorderBottom(height, color);
        return this;
    }
}

function getById(id) {
    return document.getElementById(id);
}
