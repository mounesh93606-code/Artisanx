import os
import glob
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # App Backgrounds
    content = content.replace('bg-stone-50', 'bg-brand-bg')
    content = content.replace('bg-gray-50', 'bg-brand-bg')

    # Primary Amber to Brand Dark (Buttons/Main accents)
    content = content.replace('bg-amber-600', 'bg-brand-dark')
    content = content.replace('hover:bg-amber-700', 'hover:bg-black')
    content = content.replace('text-amber-600', 'text-brand-dark')
    content = content.replace('text-amber-500', 'text-brand-dark')
    content = content.replace('border-amber-500', 'border-brand-dark')
    content = content.replace('border-amber-600', 'border-brand-dark')
    content = content.replace('ring-amber-500', 'ring-brand-dark')
    content = content.replace('focus:border-amber-500', 'focus:border-brand-dark')
    content = content.replace('focus:ring-amber-500', 'focus:ring-brand-dark')
    
    # Secondary Amber (Light backgrounds)
    content = content.replace('bg-amber-50', 'bg-brand-neon')
    content = content.replace('bg-amber-100', 'bg-brand-neon')
    content = content.replace('text-amber-700', 'text-brand-dark')
    content = content.replace('text-amber-800', 'text-brand-dark')
    content = content.replace('text-amber-900', 'text-brand-dark')
    content = content.replace('border-amber-200', 'border-brand-dark/20')

    # Teal to Brand Dark (Buttons/Main accents)
    content = content.replace('bg-teal-600', 'bg-brand-dark')
    content = content.replace('bg-teal-500', 'bg-brand-dark')
    content = content.replace('hover:bg-teal-700', 'hover:bg-black')
    content = content.replace('hover:bg-teal-600', 'hover:bg-black')
    content = content.replace('text-teal-600', 'text-brand-dark')
    content = content.replace('text-teal-500', 'text-brand-dark')
    content = content.replace('border-teal-500', 'border-brand-dark')
    content = content.replace('ring-teal-500', 'ring-brand-dark')
    content = content.replace('focus:border-teal-500', 'focus:border-brand-dark')
    content = content.replace('focus:ring-teal-500', 'focus:ring-brand-dark')

    # Indigo to Brand Dark
    content = content.replace('bg-indigo-600', 'bg-brand-dark')
    content = content.replace('bg-indigo-500', 'bg-brand-dark')
    content = content.replace('hover:bg-indigo-700', 'hover:bg-black')
    content = content.replace('text-indigo-600', 'text-brand-dark')

    # Slate to Stone (for consistency)
    content = content.replace('text-slate-', 'text-stone-')
    content = content.replace('bg-slate-', 'bg-stone-')
    content = content.replace('border-slate-', 'border-stone-')

    # Make buttons rounded-2xl if they are primary actions
    # This is a bit risky with regex, so we'll rely on global UI replacements if needed
    content = content.replace('rounded-md', 'rounded-xl')
    content = content.replace('rounded-lg', 'rounded-2xl')

    # Fix Guide Hand specific
    content = content.replace("color='#d97706'", "color='#ccff00'")
    content = content.replace('color="#d97706"', 'color="#ccff00"')

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")

if __name__ == '__main__':
    base_dir = r'c:\Users\moune\art\frontend\src'
    for root, dirs, files in os.walk(base_dir):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                process_file(os.path.join(root, file))
    print("Done applying styles.")
