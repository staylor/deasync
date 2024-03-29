#!/usr/bin/env node

/* eslint-disable */

const cp = require('child_process');
const fs = require('fs');
const path = require('path');

// Parse args
let force = false;
let debug = false;
let { arch } = process;
const { platform } = process;
const nodeV = /[0-9]+\.[0-9]+/.exec(process.versions.node)[0];
const nodeVM = /[0-9]+/.exec(process.versions.node)[0];
const args = process.argv.slice(2).filter(function(arg) {
  if (arg === '-f') {
    force = true;
    return false;
  }
  if (arg.substring(0, 13) === '--target_arch') {
    arch = arg.substring(14);
  } else if (arg === '--debug') {
    debug = true;
  }
  return true;
});
if (
  !{
    ia32: true,
    x64: true,
    arm: true,
    arm64: true,
    ppc64: true,
    ppc: true,
    s390x: true,
  }.hasOwnProperty(arch)
) {
  console.error(`Unsupported (?) architecture: \`${arch}\``);
  process.exit(1);
}

// Test for pre-built library
let modPath = `${platform}-${arch}-node-${nodeV}`;
if (!force) {
  try {
    try {
      fs.statSync(path.join(__dirname, 'bin', modPath, 'deasync.node'));
    } catch (ex) {
      modPath = `${platform}-${arch}-node-${nodeVM}`;
      fs.statSync(path.join(__dirname, 'bin', modPath, 'deasync.node'));
    }
    console.log(`\`${modPath}\` exists; testing`);
    cp.execFile(process.execPath, ['quick-test.js'], function(err, stdout, stderr) {
      if (err || stdout !== 'pass' || stderr) {
        console.log('Problem with the binary; manual build incoming');
        console.log(`stdout=${stdout}`);
        console.log(`err=${err}`);
        build();
      } else {
        console.log('Binary is fine; exiting');
      }
    });
  } catch (ex) {
    // Stat failed
    build();
  }
} else {
  build();
}

// Build it
function build() {
  const child = cp.execSync('which python');
  cp.spawn(
    process.platform === 'win32' ? 'node-gyp.cmd' : 'node-gyp',
    ['rebuild', `--python=${child.stdout}`].concat(args),
    {
      stdio: 'inherit',
    }
  ).on('exit', function(err) {
    if (err) {
      if (err === 127) {
        console.error(
          'node-gyp not found! Please upgrade your install of npm! You need at least 1.1.5 (I think) ' +
            'and preferably 1.1.30.'
        );
      } else {
        console.error('Build failed');
      }
      return process.exit(err);
    }
    afterBuild();
  });
}

// Move it to expected location
function afterBuild() {
  const targetPath = path.join(__dirname, 'build', debug ? 'Debug' : 'Release', 'deasync.node');
  const installPath = path.join(__dirname, 'bin', modPath, 'deasync.node');

  try {
    fs.mkdirSync(path.join(__dirname, 'bin'));
  } catch (ex) {}
  try {
    fs.mkdirSync(path.join(__dirname, 'bin', modPath));
  } catch (ex) {}

  try {
    fs.statSync(targetPath);
  } catch (ex) {
    console.error('Build succeeded but target not found');
    process.exit(1);
  }
  fs.renameSync(targetPath, installPath);
  console.log(`Installed in \`${installPath}\``);
}
