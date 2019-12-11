/**
 * A 3D Vector class, for this project X and Y are points on the plane, and the Z-axis is time.
 */
class Vector3D {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    /**
     * Length of this Vector3D
     */
    get magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    /**
     * Returns the Vector3D that is the sum of this and another Vector3D
     * @param {Vector3D} vec2 Other vector
     */
    add(vec2) {
        return new Vector3D(this.x + vec2.x, this.y + vec2.y, this.z + vec2.z);
    }

    /**
     * Returns the Vector3D that is the difference of this and another Vector3D
     * @param {Vector3D} vec2 Other vector
     */
    minus(vec2) {
        return new Vector3D(this.x - vec2.x, this.y - vec2.y, this.z - vec2.z);
    }

    /**
     * Returns this Vector3D scaled by some scalar
     * @param {Number} s Scale factor
     */
    scaled(s) {
        return new Vector3D(this.x * s, this.y * s, this.z * s);
    }

    /**
     * Returns the dot product of this and another Vector3D
     * @param {Vector3D} vec2 Other vector
     */
    dot(vec2) {
        return this.x * vec2.x + this.y * vec2.y + this.z * vec2.z;
    }

    /**
     * Returns the unit length Vector3D in the same direction as this Vector3D.
     */
    get normalized() {
        if (this.magnitude > 0) {
            return this.scaled(1.0 / this.magnitude);
        } else {
            throw new Error('Cannot normalize vector with zero magnitude');
        }
    }

    /**
     * Gets distance between this vector and another
     * @param {Vector3D} v
     */
    distance(v) {
        return Math.sqrt(
            Math.pow(v.x - this.x, 2) +
                Math.pow(v.y - this.y, 2) +
                Math.pow(v.z - this.z, 2)
        );
    }
}

/**
 * A Ray in 3D space, with an origin and direction
 */
class Ray {
    constructor(x1, y1, z1, x2, y2, z2) {
        this.p = new Vector3D(x1, y1, z1);
        let q = new Vector3D(x2, y2, z2);

        // Normalize direction vector
        this.d = q.minus(this.p).normalized;
    }
}

/**
 * A Cylinder in 3D space, extends infinitely in one direction
 */
class Cylinder extends Ray {
    constructor(x1, y1, z1, x2, y2, z2, r, h = Infinity) {
        super(x1, y1, z1, x2, y2, z2);
        this.r = r;
        this.h = h;
    }

    /**
     * Returns if the given ray intersects this cylinder
     * @param {Ray} ray
     */
    collides(ray) {
        let dot1 = ray.d.dot(this.d);
        let deltap = ray.p.minus(this.p);
        let dot2 = deltap.dot(this.d);

        // Solve quadratic to find intersection
        let a = ray.d.minus(this.d.scaled(dot1));
        let b = 2 * a.dot(deltap.minus(this.d.scaled(dot2)));
        a = a.dot(a);
        let c = deltap.minus(this.d.scaled(dot2));
        c = c.dot(c) - this.r * this.r;

        // If quadratic has no solutions, there is no intersection
        return b * b >= 4 * a * c;
    }

    /**
     * Returns where the given ray intersects this cylinder, or undefined if it does not
     * @param {Ray} ray
     */
    collidesAt(ray) {
        let dot1 = ray.d.dot(this.d);
        let deltap = ray.p.minus(this.p);
        let dot2 = deltap.dot(this.d);

        // Solve quadratic to find intersection
        let a = ray.d.minus(this.d.scaled(dot1));
        let b = 2 * a.dot(deltap.minus(this.d.scaled(dot2)));
        a = a.dot(a);
        let c = deltap.minus(this.d.scaled(dot2));
        c = c.dot(c) - this.r * this.r;

        // If quadratic has no solutions, there is no intersection
        if (b * b < 4 * a * c) {
            return undefined;
        }

        // Use each time to determine locations of collision
        let d = Math.sqrt(b * b - 4 * a * c);
        let t1 = (-b + d) / (2 * a);
        let t2 = (-b - d) / (2 * a);
        return [ray.p.add(ray.d.scaled(t1)), ray.p.add(ray.d.scaled(t2))];
    }

    circleTangents(x, y, z) {
        // Find x and y on cylinder at given z
        let t = (z - this.p.z) / this.d.z;
        let x1 = this.p.x + t * this.d.x;
        let y1 = this.p.y + t * this.d.y;

        // Move circle to origin
        x -= x1;
        y -= y1;

        // Calculate tangent points
        let d = Math.sqrt(x * x + y * y);
        let a = Math.asin(this.r / d);
        let b = Math.atan2(y, x);

        t = b - a;
        var p1 = new Vector3D(
            this.r * Math.sin(t) + x1,
            -this.r * Math.cos(t) + y1,
            z
        );

        t = b + a;
        var p2 = new Vector3D(
            -this.r * Math.sin(t) + x1,
            this.r * Math.cos(t) + y1,
            z
        );

        return [p1, p2];
    }
}

module.exports = {
    Vector3D: Vector3D,
    Ray: Ray,
    Cylinder: Cylinder
};
