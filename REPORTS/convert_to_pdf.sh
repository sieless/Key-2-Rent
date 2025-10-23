#!/bin/bash

###############################################################################
# Timelaine Documentation PDF Converter
# Converts all markdown reports to PDF format
###############################################################################

echo "================================================"
echo "Timelaine PDF Report Generator"
echo "================================================"
echo ""

# Check if pandoc is installed
if ! command -v pandoc &> /dev/null; then
    echo "❌ Pandoc is not installed."
    echo ""
    echo "Install Pandoc with:"
    echo "  Ubuntu/Debian: sudo apt-get install pandoc texlive-latex-base texlive-fonts-recommended"
    echo "  macOS: brew install pandoc basictex"
    echo "  Windows: choco install pandoc miktex"
    echo ""
    echo "Alternatively, use markdown-pdf:"
    echo "  npm install -g markdown-pdf"
    echo "  Then run: markdown-pdf *.md"
    echo ""
    exit 1
fi

echo "✅ Pandoc found: $(pandoc --version | head -1)"
echo ""

# Navigate to REPORTS directory
cd "$(dirname "$0")"

# List of files to convert
files=(
    "KEY2RENT_EXECUTIVE_SUMMARY"
    "KEY2RENT_TECHNICAL_DOCUMENTATION"
    "KEY2RENT_FEATURES_IMPLEMENTATION"
)

echo "Converting markdown files to PDF..."
echo ""

# Convert each file
for file in "${files[@]}"; do
    if [ -f "${file}.md" ]; then
        echo "📄 Converting ${file}.md..."

        pandoc "${file}.md" \
            -o "${file}.pdf" \
            --pdf-engine=pdflatex \
            --variable geometry:margin=1in \
            --variable fontsize=11pt \
            --variable colorlinks=true \
            --variable linkcolor=blue \
            --variable urlcolor=blue \
            --toc \
            --toc-depth=3 \
            --number-sections \
            2>/dev/null

        if [ $? -eq 0 ]; then
            echo "   ✅ Generated ${file}.pdf"

            # Get file size
            size=$(du -h "${file}.pdf" | cut -f1)
            echo "   📊 Size: $size"
        else
            echo "   ❌ Failed to generate ${file}.pdf"
            echo "   Trying alternative method without LaTeX..."

            # Try HTML to PDF (requires wkhtmltopdf)
            if command -v wkhtmltopdf &> /dev/null; then
                pandoc "${file}.md" -o "${file}.html"
                wkhtmltopdf "${file}.html" "${file}.pdf"
                rm "${file}.html"
                echo "   ✅ Generated ${file}.pdf (via HTML)"
            else
                echo "   ℹ️  Install wkhtmltopdf for alternative conversion"
            fi
        fi

        echo ""
    else
        echo "⚠️  ${file}.md not found, skipping..."
        echo ""
    fi
done

echo "================================================"
echo "PDF Generation Complete!"
echo "================================================"
echo ""

# List generated PDFs
pdf_count=$(ls -1 *.pdf 2>/dev/null | wc -l)

if [ $pdf_count -gt 0 ]; then
    echo "Generated PDFs:"
    ls -lh *.pdf | awk '{print "  📑", $9, "-", $5}'
    echo ""
    echo "✅ $pdf_count PDF report(s) generated successfully!"
else
    echo "❌ No PDFs were generated. Check errors above."
fi

echo ""
echo "Location: $(pwd)"
echo ""
echo "================================================"
