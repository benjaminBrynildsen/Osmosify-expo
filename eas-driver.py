#!/usr/bin/env python3
"""
Drive `eas build` interactively to set up ASC API Key build credentials.

What we learned from the prior run: eas-cli build, when launched without
Apple credentials but WITH our ASC API Key file in env, doesn't ask for
Apple ID — it asks "ASC Api Key ID:", "Issuer ID:", "Path to ASC Api Key:".
Send those, the rest is automatic.
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

def main():
    if os.path.exists(LOG_PATH):
        os.unlink(LOG_PATH)

    set_state('starting')

    env = os.environ.copy()
    env['NO_COLOR'] = '1'
    env['FORCE_COLOR'] = '0'
    # Don't set EXPO_ASC_API_KEY_* in env — we want a clean run

    child = pexpect.spawn(
        'npx',
        ['eas-cli', 'build', '--platform', 'ios', '--profile', 'production'],
        cwd='/home/wolfgang/Noah',
        timeout=180,
        encoding='utf-8',
        codec_errors='ignore',
        env=env,
        dimensions=(40, 200),  # bigger pty so prompt-rewriting doesn't wrap awkwardly
    )

    # Use a single big expect loop — match patterns AND echo confirmations
    # so we don't double-respond.
    KEY_ID = 'FS7LQV4533'
    ISSUER_ID = '32399b71-6b37-4c52-86c1-4a27eb98cdd1'
    KEY_PATH = '/home/wolfgang/.app-store/AuthKey_FS7LQV4533.p8'

    answered = set()  # track which questions we've answered

    def hp(child):
        try:
            return strip_ansi(child.before or '')[-200:]
        except Exception:
            return ''

    while True:
        try:
            idx = child.expect([
                r'Do you want to log in to your Apple account.*\(Y/n\)',  # 0
                r'ASC Api Key ID:',                                        # 1
                r'Issuer ID',                                              # 2
                r'Path to ASC Api Key',                                    # 3
                r'Apple ID:',                                              # 4
                r'Password \(for',                                         # 5
                r'expo\.dev/accounts/[^/]+/projects/[^/]+/builds/',        # 6 build URL
                r'Build details',                                          # 7
                r'Compressing project files',                              # 8
                r'Uploading',                                              # 9
                r'\?\s+(.+?)\s+›',                                         # 10 generic question
                pexpect.EOF,                                               # 11
                pexpect.TIMEOUT,                                           # 12
            ], timeout=240)
        except pexpect.exceptions.TIMEOUT:
            log(f'[hard timeout]\nbuf: {hp(child)}\n')
            set_state('timeout_main')
            break

        log(f'[main idx={idx}] before-tail: {hp(child)}\n')

        if idx == 0 and 'login' not in answered:
            answered.add('login')
            child.sendline('n')  # don't log in to Apple — use API key instead
            log('-> sent: n (skip Apple login)\n')
        elif idx == 1 and 'keyid' not in answered:
            answered.add('keyid')
            time.sleep(0.5)
            child.sendline(KEY_ID)
            log(f'-> sent: {KEY_ID}\n')
        elif idx == 2 and 'issuer' not in answered:
            answered.add('issuer')
            time.sleep(0.5)
            child.sendline(ISSUER_ID)
            log(f'-> sent: {ISSUER_ID}\n')
        elif idx == 3 and 'path' not in answered:
            answered.add('path')
            time.sleep(0.5)
            child.sendline(KEY_PATH)
            log(f'-> sent: {KEY_PATH}\n')
        elif idx == 6 or idx == 7:
            set_state('build_queued')
            log(f'BUILD URL: {hp(child)} {strip_ansi(child.after)[:300]}\n')
            # don't break — keep collecting output for completeness
        elif idx == 8:
            set_state('compressing')
        elif idx == 9:
            set_state('uploading')
        elif idx == 10:
            # Generic question — usually free-form, accept default if any
            captured = strip_ansi(child.match.group(1) if child.match.groups() else '')
            log(f'generic question: {captured}\n')
            time.sleep(0.5)
            child.send('\r')
        elif idx == 11:
            set_state('done')
            log('EOF\n')
            break

    # Drain remaining
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
