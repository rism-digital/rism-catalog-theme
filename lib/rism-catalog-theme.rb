# frozen_string_literal: true

require "jekyll"
require "rism-catalog-theme/version"

# Load the theme as a Jekyll plugin
require "rism-catalog-theme/commands/load-data"

# If your theme also ships templates, make it register as a theme:
Jekyll::Hooks.register :site, :after_init do |site|
  Jekyll.logger.debug "RISM theme loaded"
end