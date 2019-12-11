const { Cylinder } = require('./geometry');
const dgram = require('dgram');

class Robot {
    constructor(id, ip) {
        this.id = id;
        this.x = -1;
        this.y = -1;
        this.theta = -1;
        this.r = 5;
        this.maxspeed = 65;
        this.trajectories = [];
        this.socket = dgram.createSocket('udp4');
        this.ip = ip;
    }

    /**
     * Sends a command string to the robot
     * @param {Buffer} message
     */
    _send(message) {
        this.socket.send(message, 9750, this.ip, function(err) {
            if (err) {
                console.err('Send error: ' + err);
            }
        });
    }

    /**
     * Remove all expired trajectories
     */
    _updateTrajectories() {
        var validtrajectories = [];
        for (var trajectory of this.trajectories) {
            if (trajectory.z + trajectory.h > Date.now()) {
                validtrajectories.push(trajectory);
            }
        }

        this.trajectories = validtrajectories;
    }

    /**
     * Returns how much time should be required to go a distance at a given speed
     * @param {Number} distance
     * @param {Number} speed
     */
    static getTravelTime(distance, speed) {
        return distance / 0.325 / speed;
    }

    /**
     * Add a trajectory cylinder for this robot to be noted as following in the future
     * @param {Number} x1 Start x
     * @param {Number} y1 Start y
     * @param {Number} x2 End x
     * @param {Number} y2 End y
     * @param {Number} duration Duration of trajectory, in seconds
     * @param {Number} start Offset from current time, in seconds
     */
    addTrajectory(x1, y1, x2, y2, duration, start = 0) {
        this.trajectories.push(
            new Cylinder(
                x1,
                y1,
                Date.now() + start,
                x2,
                y2,
                Date.now() + start + duration,
                this.r * 2 + 2,
                duration
            )
        );

        // Set trajectory to be removed
        setTimeout(
            this._updateTrajectories.bind(this),
            start + duration * 1000 + 10
        );
    }

    /**
     * Updates the tracking data for this robot
     * @param {Number} x
     * @param {Number} y
     * @param {Number} theta
     */
    update(x, y, theta) {
        this.x = x;
        this.y = y;
        this.theta = theta;
    }

    /**
     * Rotate the robot by some number of degrees
     * @param {Number} degrees
     */
    turn(degrees) {
        let distance = (100 * degrees) / 360;
        console.log(`Telling robot to turn ${degrees} degrees`);

        let message = Buffer.alloc(5);
        message.write('D', 0, 1);

        if (distance > 0) {
            message.writeInt16LE(distance, 1);
            message.writeInt16LE(-distance, 3);
        } else {
            message.writeInt16LE(distance, 1);
            message.writeInt16LE(-distance, 3);
        }

        this._send(message);
    }

    /**
     * Make the robot move forwards a set distance at a given speed.
     * @param {Number} distance
     * @param {Number} speed
     */
    drive(distance, speed) {
        console.log(`Telling robot to drive ${distance} cm at speed ${speed}`);

        // Distance in cm, 3.25 mm per tick
        let time = Robot.getTravelTime(distance, speed);

        let message = Buffer.alloc(5);
        message.write('S', 0, 1);

        message.writeInt16LE(speed, 1);
        message.writeInt16LE(speed, 3);

        this._send(message);

        return setTimeout(() => {
            let message = Buffer.alloc(5);
            message.write('S', 0, 1);

            message.writeInt16LE(0, 1);
            message.writeInt16LE(0, 3);

            this._send(message);
        }, time * 1000);
    }
}

module.exports = {
    Robot: Robot
};
