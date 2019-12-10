const dgram = require('dgram');

class Robot {
    constructor(ip) {
        this.x = -1;
        this.y = -1;
        this.theta = -1;
        this.r = 10;
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
        console.log('Telling robot to turn');

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
        console.log('Telling robot to drive');

        // Distance in cm, 3.25 mm per tick
        let time = distance / 0.325 / speed;

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
