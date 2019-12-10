const { Vector3D, Ray, Cylinder } = require('./geometry');
const { Robot } = require('./robot');
const dgram = require('dgram');

// Hardcoded mapping of robots to IPs for now
const robotIPs = {
    10: '192.168.1.140'
};

// List of active Robots
const robots = [];

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
    r.turn(90);
    setTimeout(r.drive.bind(r, 30.5, 50), 2000);
}

var r = new Robot(robotIPs[10]);

commandRobot(r, 1000, 1000);
