cd docs
doxygen
rd /s /q "\\buddbliss\passport\stephen\docs\esp32"
mkdir "\\buddbliss\passport\stephen\docs\esp32"
robocopy "html" "\\buddbliss\passport\stephen\docs\esp32" ^
  /MIR /FFT /Z /MT:16 /R:2 /W:2 /COPY:DAT /DCOPY:T /NFL /NDL /NP