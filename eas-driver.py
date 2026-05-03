#!/usr/bin/env python3
"""
Drive `eas build` interactively, providing ASC API Key via the prompts.

Setup we need:
1. ENV var EXPO_ASC_API_KEY_PATH points eas-cli at the .p8 file
   → eas-cli skips the Apple login prompt and asks for KEY_ID + ISSUER_ID
2. Larger PTY (40x200) so the rewriting prompts don't wrap
3. Clear input field (Ctrl-A + Ctrl-K) before typing a value, in case
   pexpect's pty echoed back a cursor-position-report ("78", etc.)
4. Sendline only after the value is typed, with small delays
"""
import os
import re
import sys
import time
import pexpect

STATE_PATH = '/tmp/eas.state'
LOG_PATH = '/tmp/eas-driver.log'
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
TEAM_ID = '47AALDQ75L'

def clear_and_send(child, value):
    """Drain any pending bytes (cursor-position responses), clear input,
       then send the whole value in one write so per-char delays don't
       give the PTY time to inject column-number digits."""
    time.sleep(0.5)
    # Drain any pending bytes first (cursor-position-report responses)
    try:
        while True:
            child.read_nonblocking(size=4096, timeout=0.1)
    except Exception:
        pass
    # Clear the field with backspaces
    child.send('\x7f' * 80)
    time.sleep(0.15)
    # Drain again
    try:
        while True:
            child.read_nonblocking(size=4096, timeout=0.1)
    except Exception:
        pass
    # Send the entire value in one write
    child.send(value + '\r')
    time.sleep(0.4)

def main():
    if os.path.exists(LOG_PATH):
        os.unlink(LOG_PATH)
    set_state('starting')

    env = os.environ.copy()
    env['NO_COLOR'] = '1'
    env['FORCE_COLOR'] = '0'
    # 'dumb' suppresses inquirer's cursor-position-report queries that
    # would otherwise leak the column number into the input field.
    env['TERM'] = 'dumb'
    env['CI'] = '1'
    # Point eas-cli at the ASC API Key file so it skips Apple login
    env['EXPO_ASC_API_KEY_PATH'] = KEY_PATH
    env['EXPO_ASC_API_KEY_ID'] = KEY_ID
    env['EXPO_ASC_API_KEY_ISSUER_ID'] = ISSUER_ID
    env['EXPO_APPLE_TEAM_ID'] = TEAM_ID
    env['EXPO_APPLE_TEAM_TYPE'] = 'INDIVIDUAL'

    child = pexpect.spawn(
        'npx',
        ['eas-cli', 'build', '--platform', 'ios', '--profile', 'production'],
        cwd='/home/wolfgang/Noah',
        timeout=180,
        encoding='utf-8',
        codec_errors='ignore',
        env=env,
        dimensions=(40, 200),
    )

    answered = set()
    last_question = None

    def hp(child):
        try:
            return strip_ansi(child.before or '')[-300:]
        except Exception:
            return ''

    while True:
        try:
            idx = child.expect([
                r'ASC Api Key ID:',                                  # 0
                r'Issuer ID',                                        # 1
                r'Path to ASC Api Key',                              # 2
                r'Apple ID:',                                        # 3
                r'Password \(for',                                   # 4
                r'Build details',                                    # 5
                r'expo\.dev/accounts/[^/]+/projects/[^/]+/builds/',  # 6
                r'Compressing project files',                        # 7
                r'Uploading',                                        # 8
                r'Build is queued',                                  # 9
                r'Please Enter A Valid Value',                       # 10
                r'Cannot validate the credentials',                  # 11
                r'Failed to set up credentials',                     # 12
                r'Used by:.+?\(Y/n\)',                               # 13 — reuse existing ASC key prompt
                r'\(Y/n\)',                                          # 14 — generic yes/no
                r'\(y/N\)',                                          # 15 — generic no/yes (default no)
                r'Use arrow-keys\. Return to submit',                # 16 — inquirer list prompt
                r'Push Notifications',                                # 17 — push setup prompt
                r'All credentials are ready',                         # 18 — creds done; build proceeds
                pexpect.EOF,                                          # 19
            ], timeout=240)
        except pexpect.exceptions.TIMEOUT:
            log(f'[hard timeout]\nbuf: {hp(child)}\n')
            set_state('timeout_main')
            break

        log(f'[idx={idx}] tail: {hp(child)}\n')

        if idx == 0 and 'keyid' not in answered:
            answered.add('keyid')
            set_state('answering_keyid')
            clear_and_send(child, KEY_ID)
        elif idx == 1 and 'issuer' not in answered:
            answered.add('issuer')
            set_state('answering_issuer')
            clear_and_send(child, ISSUER_ID)
        elif idx == 2 and 'path' not in answered:
            answered.add('path')
            set_state('answering_path')
            clear_and_send(child, KEY_PATH)
        elif idx == 3:
            log('!! Apple ID prompt appeared — env vars not picked up\n')
            set_state('error: apple_login_required')
            break
        elif idx == 5 or idx == 6:
            set_state('build_queued')
            log(f'BUILD QUEUED: {hp(child)} {strip_ansi(child.after)[:200]}\n')
        elif idx == 7:
            set_state('compressing')
        elif idx == 8:
            set_state('uploading')
        elif idx == 9:
            set_state('queued_remote')
        elif idx == 10:
            log('!! Empty value rejected — answers must not be blank\n')
            set_state('error: blank_value')
            break
        elif idx == 11 or idx == 12:
            log(f'!! Credential failure: {hp(child)}\n')
            set_state('error: credential_failed')
            break
        elif idx == 13:
            # "Reuse existing ASC API key?" → YES
            set_state('reusing_existing_key')
            time.sleep(0.4)
            child.send('y\r')
            time.sleep(0.4)
        elif idx == 14:
            # generic Y/n → accept default (yes)
            set_state('answering_yn')
            time.sleep(0.3)
            child.send('y\r')
            time.sleep(0.3)
        elif idx == 15:
            # generic y/N → still accept (proceed)
            set_state('answering_yN')
            time.sleep(0.3)
            child.send('y\r')
            time.sleep(0.3)
        elif idx == 17:
            # "Push Notifications" prompt — pick "No, don't ask again"
            # (down arrow twice + Enter). Push key setup needs Apple
            # user auth which we can't do headless. We'll set the key
            # up via Apple Developer Portal separately. The
            # aps-environment entitlement still ships from app.json.
            set_state('skipping_push_setup')
            time.sleep(0.5)
            child.send('\x1b[B')  # arrow down → "No"
            time.sleep(0.2)
            child.send('\x1b[B')  # arrow down → "No, don't ask again"
            time.sleep(0.2)
            child.send('\r')
            time.sleep(0.5)
        elif idx == 16:
            # Generic inquirer list — accept default (first option)
            set_state('selecting_default_list_option')
            time.sleep(0.4)
            child.send('\r')
            time.sleep(0.4)
        elif idx == 18:
            set_state('credentials_ready')
            time.sleep(0.3)
        elif idx == 19:
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
