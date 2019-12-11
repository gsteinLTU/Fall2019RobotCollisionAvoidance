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
                    robot.r * 2 + 2
                )
            );
        }
    }

    return trajectories;
}

/**
 * Send messages to robot to execute a turn to face target and then drive to it
 * @param {Robot} robot
 * @param {Number} targetX
 * @param {Number} targetY
 * @param {Number} speed
 */
function _turnAndDrive(robot, targetX, targetY, speed) {
    let v = new Vector3D(targetX - robot.x, targetY - robot.y, 0);
    let distance = v.magnitude;
    let turnAngle =
        (-(Math.atan2(v.y, -v.x) + (robot.theta + Math.PI / 2)) * 180.0) /
        Math.PI;

    if (turnAngle > 180) {
        turnAngle -= 360;
    }
    if (turnAngle < -180) {
        turnAngle += 360;
    }

    console.log(`Turn angle: ${turnAngle} degrees`);

    // Send robot on its way
    robot.turn(turnAngle);
    setTimeout(robot.drive.bind(robot, distance, speed), 2000);

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
}

/**
 * Tell a robot to drive to a target position
 * @param {Number} id
 * @param {Number} targetX
 * @param {Number} targetY
 */
function commandRobot(id, targetX, targetY) {
    console.log(`Robot ${id} Target Point ${targetX}, ${targetY}`);
    let robot = robots[id];
    console.log(robot);
    var v = new Vector3D(targetX - robot.x, targetY - robot.y, 0);
    var distance = v.magnitude;
    var speed = robot.maxspeed - 10;
    const currentTrajectories = getAllTrajectories(robot.id);

    // Ray of direct trajectory
    const testRay = new Ray(
        robot.x,
        robot.y,
        Date.now() + 2,
        targetX,
        targetY,
        Date.now() + 2 + Robot.getTravelTime(distance, speed)
    );

    // Array of trajectories that the test ray intersects
    const collidingTrajectories = currentTrajectories.filter(t =>
        t.collides(testRay)
    );

    // If no collisions possible, just turn and then drive
    if (collidingTrajectories.length === 0) {
        _turnAndDrive(robot, targetX, targetY, speed);
    } else {
        // Needs augmented path to avoid collision
        console.log(
            'Probable collision detected, augmenting trajectory to avoid.'
        );

        // Find closest collision if multiple
        if (collidingTrajectories.length > 1) {
            collidingTrajectories.sort((a, b) => {
                let acol = a.collidesAt(testRay);
                let adist = min(
                    acol[0].distance(testRay.p),
                    acol[1].distance(testRay.p)
                );
                let bcol = b.collidesAt(testRay);
                let bdist = min(
                    bcol[0].distance(testRay.p),
                    bcol[1].distance(testRay.p)
                );
                return adist - bdist;
            });
        }

        let tangents = collidingTrajectories[0].circleTangents(
            robot.x,
            robot.y,
            collidingTrajectories[0].collidesAt(testRay)[0].z
        );

        // Send robot off on first leg of journey
        let tangentX = tangents[0].x;
        let tangentY = tangents[0].y;

        console.log(`Rerouting through ${tangentX},${tangentY}`);

        _turnAndDrive(robot, tangentX, tangentY, speed);

        let legDistance = new Vector3D(
            tangentX - robot.x,
            tangentY - robot.y,
            0
        ).magnitude;
        let legTime = Robot.getTravelTime(legDistance, speed) + 3;

        // Calculate next leg of trip once arived at midpoint
        setTimeout(
            commandRobot.bind(null, id, targetX, targetY),
            legTime * 1000
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

        // Create robot object if not in list
        if (robots[id] === undefined) {
            robots[id] = new Robot(id, robotIPs[id]);
        }

        robots[id].update(x, y, theta);
    }
});

server.bind(3435);

setTimeout(() => {
    commandRobot(10, 96, 50);
}, 2000);
