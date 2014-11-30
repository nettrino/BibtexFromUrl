LATEX=pdflatex
BIBTEX=bibtex
RM=rm -f

##############################
TARGET=test
##############################

TEXFILES=*.tex
BIBFILES=*.bib
#FIGURES=figures/*.pdf

.PHONY: dvi ps pdf figures

all: $(TARGET).pdf

#figures:
#	$(MAKE) -C figs

${TARGET}.bbl: $(BIBFILES) $(FIGURES)
	$(LATEX) $(TARGET)
	$(BIBTEX) $(TARGET)
	$(LATEX) $(TARGET)

$(TARGET).pdf: $(TEXFILES) $(TARGET).bbl
	$(LATEX) $(TARGET)

clean:
	$(RM) $(addprefix $(TARGET)., aux bbl blg log dvi toc lof out ps pdf)
#	$(MAKE) -C figs clean
