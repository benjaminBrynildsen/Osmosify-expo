#!/usr/bin/env python3
"""Drive `eas submit` interactively. Mirrors eas-driver.py — same
ASC API Key reuse flow."""
import os
import re
import sys
import time
import pexpect

STATE_PATH = '/tmp/eas-submit.state'
LOG_PATH = '/tmp/eas-submit.log'
ANSI = re.compile(r'\x1b\[[0-9;?]*[A-Za-z]|\x1b\][^\x07]*\x07|\x1b[()][\x00-\x7f]|\x07')
def strip_ansi(s):
    return ANSI.sub('', s or '')

def set_state(s):
    with open(STATE_PATH, 'w') as f:
        f.write(s)
    log(f'[state] {s}\n')

def log(s):
    with open(LOG_PATH, 'a') as f:
        f.write(s)

KEY_ID = 'FS7LQV4533'
ISSUER_ID = '32399b71-6b37-4c52-86c1-4a27eb98cdd1'
KEY_PATH = '/home/wolfgang/.app-store/AuthKey_FS7LQV4533.p8'
BUILD_ID = sys.argv[1] if len(sys.argv) > 1 else 'bd659144-8123-40c6-9858-83e2cfd0c87b'

def clear_and_send(child, value):
    time.sleep(0.5)
    try:
        while True:
            child.read_nonblocking(size=4096, timeout=0.1)
    except Exception:
        pass
    child.send('\x7f' * 80)
    time.sleep(0.15)
    try:
        while True:
            child.read_nonblocking(size=4096, timeout=0.1)
    except Exception:
        pass
    child.send(value + '\r')
    time.sleep(0.4)


def main():
    if os.path.exists(LOG_PATH):
        os.unlink(LOG_PATH)
    set_state('starting')

    env = os.environ.copy()
    env['NO_COLOR'] = '1'
    env['FORCE_COLOR'] = '0'
    env['TERM'] = 'dumb'
    env['CI'] = '1'
    env['EXPO_ASC_API_KEY_PATH'] = KEY_PATH
    env['EXPO_ASC_API_KEY_ID'] = KEY_ID
    env['EXPO_ASC_API_KEY_ISSUER_ID'] = ISSUER_ID

    child = pexpect.spawn(
        'npx',
        ['eas-cli', 'submit', '--platform', 'ios', '--id', BUILD_ID],
        cwd='/home/wolfgang/Noah',
        timeout=180,
        encoding='utf-8',
        codec_errors='ignore',
        env=env,
        dimensions=(40, 200),
    )

    answered = set()

    def hp(c):
        try:
            return strip_ansi(c.before or '')[-300:]
        except Exception:
            return ''

    while True:
        try:
            idx = child.expect([
                r'ASC Api Key ID:',                              # 0
                r'Issuer ID',                                    # 1
                r'Path to ASC Api Key',                          # 2
                r'Apple ID:',                                    # 3
                r'Used by:.+?\(Y/n\)',                          # 4 — reuse existing
                r'Submission completed',                         # 5
                r'Submitting your app to App Store',             # 6
                r'\(Y/n\)',                                      # 7
                r'\(y/N\)',                                      # 8
                r'failed|Error',                                 # 9
                r'Select the App Store Connect Api Key to use',  # 10 — pick existing or new
                r'Choose an existing key',                       # 11 — confirms list view
                r'Use arrow-keys\. Return to submit',            # 12 — generic list nav
                pexpect.EOF,                                     # 13
            ], timeout=240)
        except pexpect.exceptions.TIMEOUT:
            log(f'[hard timeout] {hp(child)}\n')
            set_state('timeout')
            break

        log(f'[idx={idx}] {hp(child)}\n')

        if idx == 0 and 'keyid' not in answered:
            answered.add('keyid')
            set_state('keyid')
            clear_and_send(child, KEY_ID)
        elif idx == 1 and 'issuer' not in answered:
            answered.add('issuer')
            set_state('issuer')
            clear_and_send(child, ISSUER_ID)
        elif idx == 2 and 'path' not in answered:
            answered.add('path')
            set_state('path')
            clear_and_send(child, KEY_PATH)
        elif idx == 3:
            set_state('error: apple_login_required')
            break
        elif idx == 4:
            set_state('reusing_existing_key')
            time.sleep(0.4)
            child.send('y\r')
            time.sleep(0.4)
        elif idx == 5:
            set_state('submitted')
            log(f'!!! SUBMITTED !!!\n')
        elif idx == 6:
            set_state('submitting')
        elif idx == 7 or idx == 8:
            time.sleep(0.3)
            child.send('y\r')
            time.sleep(0.3)
        elif idx == 9:
            set_state(f'error: see log')
            log(f'!! Error: {hp(child)}\n')
            break
        elif idx == 10 or idx == 11 or idx == 12:
            # List prompt — first option is highlighted (existing key); just Enter
            set_state('selecting_existing_key')
            time.sleep(0.6)
            child.send('\r')
            time.sleep(0.6)
        elif idx == 13:
            set_state('done')
            break

    try:
        out = child.read_nonblocking(size=8192, timeout=2)
        log(f'final drain: {strip_ansi(out)}\n')
    except Exception:
        pass

    child.close()


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        with open(STATE_PATH, 'w') as f:
            f.write(f'error: {e}')
        raise
