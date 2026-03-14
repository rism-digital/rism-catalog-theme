Gem::Specification.new do |spec|
  spec.name          = "rism-catalogue-theme"
  spec.version       = "1.1.0"
  spec.authors       = ["Rodolfo Zitellini", "Andrew Hankinson", "Laurent Pugin"]
  spec.email         = ["rodolfo.zitellini@rism.digital", "andrew.hankinson@rism.digital", "laurent.pugin@rism.digital"]

  spec.summary       = "Shared theme for RISM work catalogues websites."
  spec.homepage      = "http://rism.digital"
  spec.license       = "MIT"

  spec.files         = `git ls-files -z`.split("\x0").select { |f| f.match(%r!^(lib|assets|_layouts|_includes|_sass|LICENSE|README|_config\.yml)!i) }
  
  spec.add_runtime_dependency "jekyll", "~> 4.1"
end
