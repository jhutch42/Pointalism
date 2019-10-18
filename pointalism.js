const MIN_CLUSTER_SIZE = 1;
const MAX_CLUSTER_SIZE = 16;
const CLUSTER_RADIUS = 600;
const PIXEL_MOVEMENT_THRESHOLD = 6;
const THROW_THRESHOLD = 120;
const POINT_HISTORY_MAX = 5;
const MIN_DRAG_TIME = 20;
const ROTATION_THRESHOLD = 150;
const ROTATION_SEPARATION_MAX = 300;
const CLICK_MAX = 200;

let clusterKey = 0;
/** PointDetector finds and stores all touchpoint and cluster data.
 */
class PointDetector {

    constructor() {
        this.data = {
            touchList: {},
            clusters: {},
            clicks: []
        }
    }

    /** Whenewver a touch event occurs, this function directs the flow
     * @param event the touch event
     * @return the detector data -> touchpoints and clusters
     */
    update(event) {
        const changes = event.changedTouches;
        switch (event.type) {
            case 'touchstart':
                this.addTouchPoints(changes).updateClusters(changes);
                break;
            case 'touchmove':
                this.moveTouchPoints(changes).updateClusterData();
                break;
            case 'touchend':
                this.removeTouchPoints(changes);
                break;
            default:
                // Do Nothing
                break;
        }
        return this.data;
    }

    /** Adds a new touch point to the touchpoint data object
     * @param changes changed touches
     */
    addTouchPoints(changes) {
        Object.values(changes).forEach(point => this.data.touchList[point.identifier] = new TouchPoint(point));
        return this;
    }

    /** Updates positon of touch points
     * @param changes changed touches
     */
    moveTouchPoints(changes) {
        Object.values(changes).forEach(point => this.data.touchList[point.identifier].setPosition(point.screenX, point.screenY).logHistory());
        return this;
    }

    /** Removes a touchpoint after touchend
     * @param changes Changed touchpoints
     */
    removeTouchPoints(changes) {

        Object.values(changes).forEach(point => {
            const id = point.identifier;
            const p = this.data.touchList[id];
            this.removeMemberClusters(this.data.touchList[point.identifier].membership);
            if (this.wasAClick(p)) {
                this.data.clicks.push(point);
            } else if (p.dragging && p.wasThrown()) {
                p.interactionElement.throw(p.throwData);
            }
            delete this.data.touchList[id];
            return this;
        });
    }

    /** Finds all clusters currently located on the table.  Runs every time a touchpoint is added or removed */
    updateClusters(changes) {
        const clustersFound = [];
        if (Object.keys(this.data.touchList).length > MIN_CLUSTER_SIZE && Object.keys(this.data.touchList).length <= MAX_CLUSTER_SIZE) {
            const changedPoints = this.sortPoints(changes);
            while (changedPoints.length > 0) {
                const pointOfInterest = changedPoints.shift();
                const cluster = [];
                Object.values(this.data.touchList).forEach(point => {
                    if (this.isClusterMember(this.getSeparation(pointOfInterest.x, point.x), this.getSeparation(pointOfInterest.y, point.y))) {
                        cluster.push(point);
                        if (cluster.length > MIN_CLUSTER_SIZE) {
                            clustersFound.push(new Cluster(cluster));
                        }
                    }
                });
            }
        }
        if (clustersFound.length > 0) {
            this.storeClusterData(clustersFound);
        }
        return this;
    }

    removeMemberClusters(clusterList) {
        clusterList.forEach(id => {
            Object.values(this.data.clusters).forEach(clusterList => {
                clusterList.forEach((cluster, index) => {
                    if (cluster.key === id) {
                        delete clusterList[index];
                        clusterList.splice(index, 1);
                    }
                })
            });
        });
    }

    updateClusterData() {
        Object.values(this.data.clusters).forEach(clusterList =>
            clusterList.forEach(cluster => cluster.updateData()));
    }

    /** Finds the distance between two touchpoints */
    getSeparation(a, b) {
        return Math.abs(a - b);
    }

    /** After updateClusters runs, the data needs to be sorted by cluster size and stored in the data.cluster object
     * @param clusters the active clusteres found.
     */
    storeClusterData(clusters) {
        clusters.forEach(cluster => {
            if (this.data.clusters[cluster.size] === undefined) {
                this.data.clusters[cluster.size] = [cluster];
            } else {
                this.data.clusters[cluster.size].push(cluster);
            }
        });
    }

    /** Checks the distance between two touch points and determines if it belongs in a cluster
     * @param x distance between two points.
     * @param y the y distance between two points.
     */
    isClusterMember(x, y) {
        const distance = TR.getHypotenuse(x, y);
        return distance < CLUSTER_RADIUS;
    }

    /** Since data is normally stored in an object, this function takes that object and stores the values in an array, sorted by the x value
     * from smallest to largest
     * @return array of sorted touchpoints
     */
    sortPoints(changes) {
        let pointArray = [];
        Object.values(changes).forEach(point => pointArray.push(this.data.touchList[point.identifier]));
        pointArray = pointArray.sort((a, b) => a.x - b.x);
        return pointArray;
    }

    wasAClick(point) {
        const currentTime = new Date().getTime();
        return currentTime - point.createdAt < CLICK_MAX;
    }

    evaluateClickData = elements => {
        this.data.clicks.forEach(click => {
            elements.forEach(e => {
                if (e.isInside(click.screenX, click.screenY)) {
                    console.log(e.element.animations.rotation)
                    if (e.element.animations.rotation.interval > 0) {
                        clearInterval(e.element.animations.rotation.interval);
                        e.element.animations.rotation = {};
                    } else {
                        e.element.rotationAnimation('very fast', 2000, true);
                    }
                }
            });
        });
        this.data.clicks = [];
    }
}

/** A Cluster is any group of points within a maximum separation */
class Cluster {

    constructor(points) {
        this.key = clusterKey;
        this.clusterKey = clusterKey + 1;
        this.points = points; // The points that make up the cluster
        points.forEach(point => point.membership.push(this.key));
        this.size = points.length; // The size of the cluster
        this.edgeValues = this.getEdgeValues(); // Minima and maxima
        this.widthHistory = [this.getWidth()]; // Stores Historical width data
        this.heightHistory = [this.getHeight()]; // Stores Historical Height data
        this.corners = this.getCorners(); // Corners representing a rectangle around the cluster
        this.center = this.getCenter(); // The center of the cluster based on a rectangle around it
        this.edges = this.getEdges(); // Creates the edges of the graph
        this.zooming = false;
        this.rotating = false;
        this.interactionElement = null;
    }

    /** Gets the center of the cluster in pixels
     * @return object containing x and y position of the cluster's center.
     */
    getCenter() {
        return {
            x: 0.5 * (this.edgeValues.maxX + this.edgeValues.minX),
            y: 0.5 * (this.edgeValues.maxY + this.edgeValues.minY)
        }
    }

    /** Gets the width of the cluster at its widest point
     * @return the width of the cluster.
     */
    getWidth() {
        return Math.abs(this.edgeValues.maxX - this.edgeValues.minX);
    }

    /** Gets the height of the cluster at its tallest point
     * @return the height of the cluster.
     */
    getHeight() {
        return Math.abs(this.edgeValues.maxY - this.edgeValues.minY);
    }

    /** Gets the maximum and minimum values for x and y of the cluster.
     * @return object containing the max and min position values.
     */
    getEdgeValues() {
        const edgeValues = {
            minX: 0,
            maxX: 0,
            minY: 0,
            maxY: 0
        }
        this.points.sort((a, b) => {
            return a.x - b.x;
        });

        edgeValues.maxX = this.points[this.points.length - 1].x;
        edgeValues.minX = this.points[0].x;

        this.points.sort((a, b) => {
            return a.y - b.y;
        });

        edgeValues.maxY = this.points[this.points.length - 1].y;
        edgeValues.minY = this.points[0].y;

        return edgeValues;
    }

    /** Calculates the corners of a rectangle that surrounds the cluster.  0 represents top left, 1 top right
     * 2 bottom right, 3 bottom left.
     * @return object containing the 4 corners of the rectangle
     */
    getCorners() {
        return [{
            x: this.edgeValues.minX,
            y: this.edgeValues.minY
        },
        {
            x: this.edgeValues.maxX,
            y: this.edgeValues.minY
        },
        {
            x: this.edgeValues.maxX,
            y: this.edgeValues.maxY
        },
        {
            x: this.edgeValues.minX,
            y: this.edgeValues.maxY
        }];
    }

    /* When Touchpoints are moved, cluster data is updated */
    updateData() {
        this.edgeValues = this.getEdgeValues(); // Minima and maxima
        this.widthHistory.unshift(this.getWidth()); // Stores Historical width data
        this.heightHistory.unshift(this.getHeight()); // Stores Historical Height data
        this.corners = this.getCorners(); // Corners representing a rectangle around the cluster
        this.center = this.getCenter(); // The center of the cluster based on a rectangle around it
        this.edges = this.getEdges(); // Creates the edges of the graph
        trimArray(this.widthHistory, POINT_HISTORY_MAX);
        trimArray(this.heightHistory, POINT_HISTORY_MAX);
    }

    /** Creates edges of the graph by connecting the closest points */
    getEdges() {
        const edges = [];
        const pointQueue = [...this.points];
        pointQueue.sort((a, b) => a.x - b.x);
        while (pointQueue.length > 1) {
            const node = pointQueue.shift();
            const weights = [];
            pointQueue.forEach((point, index) => {
                weights.push({
                    weight: TR.getHypotenuse(TR.getSideLength(node.x, point.x), TR.getSideLength(node.y, point.y)),
                    pointIndex: index
                });
            });
            weights.sort((a, b) => a - b);
            edges.push({
                nodes: [node, pointQueue[weights[0].pointIndex]],
                weight: parseInt(weights[0].weight, 10)
            });
            const temp = pointQueue[0];
            pointQueue[0] = pointQueue[weights[0].pointIndex];
            pointQueue[weights[0].pointIndex] = temp;
        }
        return edges;
    }


    pinchZoom() {
        if (this.widthHistory.length > POINT_HISTORY_MAX - 1 && this.heightHistory.length > POINT_HISTORY_MAX - 1) {
            const zoomValue = TR.getHypotenuse(this.widthHistory[0], this.heightHistory[0]) - TR.getHypotenuse(this.widthHistory[this.widthHistory.length - 1], this.heightHistory[this.heightHistory.length - 1]);
            const w = this.widthHistory[0];
            const h = this.heightHistory[0];
            trimArray(this.widthHistory, POINT_HISTORY_MAX);
            trimArray(this.heightHistory, POINT_HISTORY_MAX);
            this.widthHistory.unshift(w);
            this.heightHistory.unshift(h);
            this.interactionElement.zoom(zoomValue);
        }
    }

    twoFingerRotate() {
        const point1 = this.points[0];
        const point2 = this.points[1];
        const sum = -(TR.getRotationSum(point1.positionHistory, point2.positionHistory) / 2);
        this.interactionElement.rotation += sum;
        this.interactionElement.element.rotate(this.interactionElement.rotation);

    }
}

class Constellation {

    constructor(points) {
        this.points = points;
        this.angles = decompose(this.points);
        this.knownConstellationElement = this.drawToKnownConstellationsArea();
    }


    compare(points) {

        const anglesB = decompose(points);
        const testAngles = [];
        anglesB.forEach(angle => testAngles.push({ angle: angle, found: false }));
        testAngles.forEach(element => {
            let notFoundYet = true;
            if (notFoundYet) {
                this.angles.forEach(element_2 => {
                    if (Math.abs(element.angle - element_2) < angleThreshold) {
                        if (!element.found) {
                            element.found = true;  // Mark this as found
                            notFoundYet = false;   // Found the Angle
                        }
                    }
                });
            }
        });

        let count = 0;
        testAngles.forEach(angle => {
            if (angle.found) {
                count++;
            }
        });

        if (count === 3) {
            this.knownConstellationElement.style.backgroundColor = 'green';
        } else {
            this.knownConstellationElement.style.backgroundColor = 'white';
        }
        return count === 3;
    }

}

/** Represents a touchpoint on the screen. */
class TouchPoint {
    constructor(point) {
        this.createdAt = new Date().getTime();
        this.x = point.screenX;  // Current X position
        this.y = point.screenY;  // Current Y position
        this.identifier = point.identifier;  // Unique identifier given by the browser.
        this.interactionElement = undefined; // When a point is interacting with an element, that element is stored here.
        this.positionHistory = [];  // Holds the historical point data. Used for zooming
        this.membership = [];  // keys of clusters that this point is a part of.
        /* State Identifiers */
        this.dragging = false;
        this.zooming = false;
        this.rotating = false;

        this.throwData = {distance: 0, time: 0, start: {x: 0, y: 0}, finish: {x: 0, y: 0}}; 
        
    }

    /** Sets the position of the point in pixels
     * @param x the x position.
     * @param y the y position.
     * @return this object
     */
    setPosition(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }

    /* logs the historical Position */
    logHistory() {
        this.positionHistory.unshift({ x: this.x, y: this.y, created: new Date().getTime() });
        trimArray(this.positionHistory, POINT_HISTORY_MAX);
        return this;
    }

    dragElement() {
        if (this.dragging && this.interactionElement) {
            this.interactionElement.repositionCenter(this.x, this.y);
        }
        return this;
    }

    wasMoved() {
        let moved = false;
        if (this.positionHistory.length > 4) {
            const value = this.getMovementValue(this.x, this.positionHistory[this.positionHistory.length - 1].x, this.y, this.positionHistory[this.positionHistory.length - 1].y);
            if (Math.abs(value.x) > PIXEL_MOVEMENT_THRESHOLD || Math.abs(value.y) > PIXEL_MOVEMENT_THRESHOLD) {
                moved = true;
            }
        }
        return moved;
    }

    wasThrown() {
        let thrown = false;
        if (this.positionHistory.length > 4) {
            const value = this.getMovementValue(this.x, this.positionHistory[this.positionHistory.length - 1].x, this.y, this.positionHistory[this.positionHistory.length - 1].y);
            if (Math.abs(value.x) > THROW_THRESHOLD || Math.abs(value.y) > THROW_THRESHOLD) {
                thrown = true;
                this.throwData = { 
                    distance: TR.getHypotenuse(Math.abs(value.x), Math.abs(value.y)), 
                    time: (this.positionHistory[0].created - this.positionHistory[this.positionHistory.length - 1].created),
                    start: {
                        x: this.positionHistory[this.positionHistory.length - 1].x,
                        y: this.positionHistory[this.positionHistory.length - 1].y
                    },
                    finish: {
                        x: this.positionHistory[0].x,
                        y: this.positionHistory[0].y
                    }
                };
            }
        }
        return thrown;
    }

    getMovementValue(x1, x2, y1, y2) {
        const xDiff = x1 - x2;
        const yDiff = y1 - y2;
        return { x: xDiff, y: yDiff };
    }

    startZooming() {
        this.dragging = false;
        this.rotating = false;
        this.zooming = true;
    }

    startRotating() {
        this.dragging = false;
        this.rotating = true;
        this.zooming = false;
    }

    isUnoccupied() {
        return !(this.dragging || this.rotating || this.zooming);
    }
}

/** Math functions */
class Trig {

    constructor() { }

    /** Used to find the quadrant of an angle in the unit circle.  b is the reference point, a is the point
     * that is being investigated.  
     * @param a point to investigate
     * @param b reference point
     * @return the quadrant that a is in.
     */
    getQuadrant(a, b) {
        let quadrant = 0;
        if (a.x < b.x && a.y > b.y) {
            quadrant = 1;
        } else if (a.x > b.x && a.y > b.y) {
            quadrant = 2;
        } else if (a.x > b.x && a.y < b.y) {
            quadrant = 3;
        } else {
            quadrant = 4;
        }
        return quadrant;
    }

    /** finds the angle of a right triangle when opposite and adjacent sides are known
     * @param adjacent adj side of right triangle.
     * @param opposite opp side of right triangle.
     * @param quadrant The quadrant of the triangle based on the unit circle.
     * @retrun the angle in degrees.
     */
    getTheta(adjacent, opposite, quadrant) {
        // tangent of opposite over adjacent
        let theta = Math.atan(opposite / adjacent);
        switch (quadrant) {
            case 2:
                theta = Math.PI - theta;
                break;
            case 3:
                theta += Math.PI;
                break;
            case 4:
                theta = 2 * Math.PI - theta;
                break;
        }
        return this.radToDegrees(theta);
    }

    /** Converts an angle in radians to degrees
     * @param theta the angle to convert in rads
     * @return the angle in degrees
     */
    radToDegrees(theta) {
        return theta * 180 / Math.PI;
    }

    /** Gets hypotenuse of right triangle
     * @param adjacent adj side of right triangle
     * @param opposite opp side of right triangle
     * @return hypotenuse of right triangle.
     */
    getHypotenuse(adjacent, opposite) {
        return Math.sqrt(Math.pow(adjacent, 2) + Math.pow(opposite, 2));
    }

    /** Gets the side of a triangle
     * @param a point a in pixels
     * @param b point b in pixels
     * @return the length of the side.
     */
    getSideLength(a, b) {
        return Math.abs(a - b);
    }

    /** Finds the sum or rotation over a series of points stored in two separate arrays
     * @param pointArray_A the array of x, y pairs
     * @param pointArray_B the array of x, y paris
     * @return the sum of the rotations without the anomoly points.
     */
    getRotationSum(pointArray_A, pointArray_B) {
        const rotationArray = [];
        pointArray_A.forEach((point, index) => {
            if (pointArray_B[index] != undefined) {
                rotationArray.push(this.getAngleFromZero(point, pointArray_B[index]));
            }
        });

        let sum = 0;
        rotationArray.forEach((angle, index) => {
            if (index < rotationArray.length - 1) {
                const difference = angle - rotationArray[index + 1];
                if (difference < ROTATION_THRESHOLD) {
                    sum += angle - rotationArray[index + 1];
                }
            }
        });

        return sum;
    }

    getAngleFromZero(point_a, point_b) {
        const x = this.getSideLength(point_a.x, point_b.x);
        const y = this.getSideLength(point_a.y, point_b.y);
        return this.getTheta(x, y, this.getQuadrant(point_a, point_b));
    }

    getHypotenuseWithThetaAndOpposite(opposite, theta) {
        // Sin = O/H
        const theta_rads = this.degreesToRads(theta);
        return opposite / Math.sin(theta_rads)
    }

    getHypotenuseWithThetaAndAdjacent(opposite, theta) {
        // Cosine = O/H
        const theta_rads = this.degreesToRads(theta);
        return opposite / Math.sin(theta_rads)
    }

    degreesToRads(theta) {
        return theta * Math.PI / 180;
    }

    getOppositeWithThetaAndHypotenuse(hypotenuse, theta) {
        // o = sin(theta)* h
        return hypotenuse * Math.sin(this.degreesToRads(theta));
    }

    getAdjacentWithThetaAndHypotenuse(hypotenuse, theta) {
        // a = sin(theta)* h
        return hypotenuse * Math.cos(this.degreesToRads(theta));
    }
    
    getAdjustedTheta(theta, quadrant) {
        
        switch (quadrant) {
            case 2:
                return 180 - theta;
            case 3: 
                return theta - 180;
            case 4:
                return 360 - theta;
            default:
                return theta;
        }
    }

}


PointDetector.prototype.evaluateTouchData = (results, elements) => {

    if (elements.length > 0) {
        if (thereAreClustersOfTwo()) {
            evaluatePointsForRotation(results, elements);
            evaluatePointsForZoom(results, elements);
        }
        evaluatePointsForDrag(results, elements);
    }

    function evaluatePointsForRotation(results, elements) {
        Object.values(results.clusters['2']).forEach(cluster => {
            if (!cluster.zooming) {
                if (cluster.rotating) {
                    cluster.twoFingerRotate();
                } else {
                    if (elements.length > 0) {
                        elements.forEach(e => {
                            cluster.rotating = e.checkRotation(cluster);
                            if (cluster.rotating) {
                                cluster.interactionElement = e;
                            }
                        });
                    }
                }
            }
        });
    }

    function evaluatePointsForZoom(results, elements) {
        Object.values(results.clusters['2']).forEach(cluster => {
            if (!cluster.rotating) {
                if (cluster.zooming) {
                    cluster.pinchZoom();
                } else {
                    if (elements.length > 0) {
                        elements.forEach(e => {
                            cluster.zooming = e.checkZoom(cluster.points[0], cluster.points[1]);
                            if (cluster.zooming) {
                                cluster.interactionElement = e;
                            }
                        });
                    }
                }
            }
        });
    }


    function evaluatePointsForDrag(results, elements) {
        Object.values(results.touchList).forEach(point => {
            if (point.wasMoved()) {
                if (!point.zooming) {
                    if (point.dragging) {
                        point.dragElement();
                    } else {
                        if (elements.length > 0) {
                            elements.forEach(e => {
                                if (compareTime(point.createdAt, new Date().getTime(), MIN_DRAG_TIME)) {
                                    e.checkDrag(point);
                                }
                            })
                        }
                    }
                }
            }
        });
    }

    function thereAreClustersOfTwo() {
        return (results.clusters['2'] !== undefined && Object.values(results.clusters['2']).length > 0);
    }
}


function compareTime(timeA, timeB, threshold) {
    return timeB - timeA > threshold;
}

function trimArray(array, size) {
    if (array.length > size) {
        array.pop();
    }
}


const TR = new Trig();