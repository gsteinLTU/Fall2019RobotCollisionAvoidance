const { Vector3D, Ray, Cylinder } = require('./geometry');
const { Robot } = require('./robot');
const dgram = require('dgram');

// Hardcoded mapping of robots to IPs for now
const robotIPs = {
    10: '192.168.1.140',
    13: '127.0.0.1'
};

// Active Robots
const robots = {};

/**
 * Finds all trajectories for active robots, creating an upwards pointing
 * Cylinder at the current location of any stationary Robots.
 */
function getAllTrajectories() {
    const trajectories = [];

    for (robot of robots) {
        // If robot has trajectories, use those
        if (robot.trajectories.length !== 0) {
            for (t of robot.trajectories) {
                trajectories.push(t);
            }
        } else {
            // Else assume robot is stationary
            trajectories.push(
                new Cylinder(robot.x, robot.y, 0, robot.x, robot.y, 1, robot.r)
            );
        }
    }

    return trajectories;
}

function commandRobot(robot, targetX, targetY) {
    var v1 = new Vector3D(-Math.cos(robot.theta), -Math.sin(robot.theta), 0);
    var v2 = new Vector3D(targetX - robot.x, targetY - robot.y, 0).normalized;

    var turnAngle = (Math.acos(v1.dot(v2)) * 180.0) / Math.PI;

    robot.turn(turnAngle);

    //setTimeout(robot.drive.bind(robot, 30.5, 50), 2000);
}

// Set up UDP listener to
var server = dgram.createSocket('udp4');

server.on('listening', function() {
    var local = server.address();
    console.log('listening on ' + local.address + ':' + local.port);
});

server.on('message', function(message, remote) {
    if (message.length < 20) {
        console.log(
            `invalid message ${remote.address}:
            ${remote.port} ${message.toString('hex')}`
        );
    } else {
        // Unpack message
        let id = message.readInt32LE(0);
        let x = message.readFloatLE(4) / 10.0;
        let y = message.readFloatLE(8) / 10.0;
        let theta = message.readDoubleLE(12);

        // console.log(id);
        // console.log(x);
        // console.log(y);
        // console.log(theta);

        // Create robot object if not in list
        if (robots[id] === undefined) {
            robots[id] = new Robot(robotIPs[id]);
        }

        robots[id].update(x, y, theta);
    }
});

server.bind(3434);

setTimeout(() => {
    commandRobot(robots[10], 130, 30);
}, 3000);
