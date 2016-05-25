LATEX=pdflatex
BIBTEX=bibtex
BIBER=biber
RM=rm -f

##############################
TARGET1=test
TARGET2=biblatex
##############################

TEXFILES1=test.tex
BIBFILES1=test.bib

TEXFILES2=biblatex.tex
BIBFILES2=biblatex.bib

.PHONY: dvi ps pdf figures misc online

all: misc online

misc: $(TARGET1).pdf
online: $(TARGET2).pdf

${TARGET1}.bbl: $(BIBFILES1)
	$(LATEX) $(TARGET1)
	$(BIBTEX) $(TARGET1)
	$(LATEX) $(TARGET1)

$(TARGET1).pdf: $(TEXFILES1) $(TARGET1).bbl
	$(LATEX) $(TARGET1)

${TARGET2}.bbl: $(BIBFILES2)
	$(LATEX) $(TARGET2)
	$(BIBER) $(TARGET2)
	$(LATEX) $(TARGET2)

$(TARGET2).pdf: $(TEXFILES2) $(TARGET2).bbl
	$(LATEX) $(TARGET2)
	$(BIBER) $(TARGET2)
	$(LATEX) $(TARGET2)

clean:
	$(RM) $(addprefix $(TARGET1)., aux bbl blg log dvi toc lof out ps pdf bcf run.xml)
	$(RM) $(addprefix $(TARGET2)., aux bbl blg log dvi toc lof out ps pdf bcf run.xml)
