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
 * @param {Number} ignoreID Robot ID to not include in list.
 */
function getAllTrajectories(ignoreID = -1) {
    const trajectories = [];

    for (robot of Object.values(robots)) {
        if (robot.id === ignoreID) {
            continue;
        }

        // If robot has trajectories, use those
        if (robot.trajectories.length !== 0) {
            for (t of robot.trajectories) {
                trajectories.push(t);
            }
        } else {
            // Else assume robot is stationary
            trajectories.push(
                new Cylinder(
                    robot.x,
                    robot.y,
                    Date.now(),
                    robot.x,
                    robot.y,
                    Date.now() + 1,
                    robot.r * 2 + 1
                )
            );
        }
    }

    return trajectories;
}

/**
 * Tell a robot to drive to a target position
 * @param {Robot} robot
 * @param {Number} targetX
 * @param {Number} targetY
 */
function commandRobot(robot, targetX, targetY) {
    var v = new Vector3D(targetX - robot.x, targetY - robot.y, 0);

    var distance = v.magnitude;
    var speed = robot.maxspeed - 10;
    const currentTrajectories = getAllTrajectories(robot.id);

    console.log(v);
    console.log(currentTrajectories);

    // If no collisions possible, just turn and then drive
    if (
        !currentTrajectories.some(t => {
            t.collides(
                new Ray(
                    robot.x,
                    robot.y,
                    Date.now() + 2,
                    targetX,
                    targetY,
                    Date.now() + 2 + Robot.getTravelTime(distance, speed)
                )
            );
        })
    ) {
        var turnAngle =
            (-(Math.atan2(v.y, -v.x) - robot.theta) * 180.0) / Math.PI;

        if (turnAngle > 180) {
            turnAngle = -360 + turnAngle;
        } else if (turnAngle < -180) {
            turnAngle = 360 + turnAngle;
        }

        console.log(`Turn angle: ${turnAngle} degrees`);

        // Send robot on its way
        //robot.turn(turnAngle);
        //setTimeout(robot.drive.bind(robot, distance, speed), 2000);

        // Add trajectories so other robots will avoid this one's path
        robot.addTrajectory(robot.x, robot.y, robot.x, robot.y, 2);
        robot.addTrajectory(
            robot.x,
            robot.y,
            targetX,
            targetY,
            Robot.getTravelTime(distance, speed),
            2
        );
    } else {
        // Needs augmented path to avoid collision
        console.log(
            'Possible collision detected, augmenting trajectory to avoid.'
        );
    }
}

// Set up UDP listener for robot position/orientation updates
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

        if (id === 10) {
            // console.log(id);
            // console.log(x);
            // console.log(y);
            // console.log((theta * 180) / Math.PI);
        }

        // Create robot object if not in list
        if (robots[id] === undefined) {
            robots[id] = new Robot(id, robotIPs[id]);
        }

        robots[id].update(x, y, theta);
    }
});

server.bind(3435);

setTimeout(() => {
    console.log(robots[10]);
    commandRobot(robots[10], 96, 58);
}, 2000);
