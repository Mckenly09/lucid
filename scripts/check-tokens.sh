#!/usr/bin/env bash
# Fails if app code uses hex colors, rgb(), or arbitrary Tailwind values.
# Allowed exception: max-w-[85%] on chat bubbles.
set -u
dirs="src"
fail=0

hex=$(grep -rnE --include='*.ts' --include='*.tsx' '#[0-9a-fA-F]{3,8}\b' $dirs 2>/dev/null | grep -v '// tokens-ok')
rgb=$(grep -rnE --include='*.ts' --include='*.tsx' 'rgba?\(' $dirs 2>/dev/null | grep -v '// tokens-ok')
arb=$(grep -rnE --include='*.tsx' -- '-\[[^]]+\]' $dirs 2>/dev/null | grep -v 'max-w-\[85%\]' | grep -v '// tokens-ok')

if [ -n "$hex" ]; then echo "Hex colors found (use tokens):"; echo "$hex"; fail=1; fi
if [ -n "$rgb" ]; then echo "rgb()/rgba() found (use tokens with opacity):"; echo "$rgb"; fail=1; fi
if [ -n "$arb" ]; then echo "Arbitrary Tailwind values found:"; echo "$arb"; fail=1; fi

if [ $fail -eq 0 ]; then echo "Tokens OK"; fi
exit $fail
