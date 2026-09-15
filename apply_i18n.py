import os
import re

frontend_dir = r"c:\Users\moune\art\frontend\src"

replacements = [
    # Auth
    (r">Login<", r">{t('auth.login')}<"),
    (r"'Login'", r"t('auth.login')"),
    (r'"Login"', r"t('auth.login')"),
    (r">Send OTP<", r">{t('auth.send_otp')}<"),
    (r"'Send OTP'", r"t('auth.send_otp')"),
    (r">Verify OTP<", r">{t('auth.verify')}<"),
    (r"'Verify OTP'", r"t('auth.verify')"),
    (r">Register<", r">{t('auth.register')}<"),
    (r"'Register'", r"t('auth.register')"),
    (r">Select Role<", r">{t('auth.select_role')}<"),
    (r"'Select Role'", r"t('auth.select_role')"),
    (r">Artisan<", r">{t('auth.artisan')}<"),
    (r"'Artisan'", r"t('auth.artisan')"),
    (r">Buyer<", r">{t('auth.buyer')}<"),
    (r"'Buyer'", r"t('auth.buyer')"),
    (r">Facilitator<", r">{t('auth.facilitator')}<"),
    (r"'Facilitator'", r"t('auth.facilitator')"),

    # Common
    (r">Processing\.\.\.<", r">{t('common.loading')}<"),
    (r"'Processing\.\.\.'", r"t('common.loading')"),
    (r">Loading\.\.\.<", r">{t('common.loading')}<"),
    (r"'Loading\.\.\.'", r"t('common.loading')")
]

for root, _, files in os.walk(frontend_dir):
    for f in files:
        if f.endswith('.tsx'):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as file:
                content = file.read()

            new_content = content
            needs_import = False
            for old, new in replacements:
                if re.search(old, new_content):
                    new_content = re.sub(old, new, new_content)
                    needs_import = True
            
            if needs_import:
                if "useTranslation" not in new_content:
                    imports_end = 0
                    lines = new_content.split('\n')
                    for i, line in enumerate(lines):
                        if line.startswith('import '):
                            imports_end = i
                    
                    lines.insert(imports_end + 1, "import { useTranslation } from 'react-i18next';")
                    new_content = '\n'.join(lines)

                def_patterns = [
                    (r"(export\s+(default\s+)?function\s+\w+\s*\([^\)]*\)\s*\{)", r"\1\n  const { t } = useTranslation();"),
                    (r"(const\s+\w+\s*=\s*(?:<[^>]*>\s*)?\([^\)]*\)\s*(?::\s*React\.FC[^\=]*)?=>\s*\{)", r"\1\n  const { t } = useTranslation();")
                ]
                
                for p, rep in def_patterns:
                    if re.search(p, new_content):
                        if "const { t }" not in new_content and "const { t, i18n }" not in new_content:
                            new_content = re.sub(p, rep, new_content)

            if new_content != content:
                with open(path, 'w', encoding='utf-8') as file:
                    file.write(new_content)
                print(f"Updated {f}")

print("Done updating components.")
