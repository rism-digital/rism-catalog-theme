require "jekyll"
require "json"
require "net/http"
require "uri"
require "csv"
require "fileutils"
require_relative "../work_extractor"

module Jekyll
  module RismCatalogueTheme
    class LoadData < Command
      @docs = []

      def self.init_with_program(prog)
        prog.command("load-data".to_sym) do |c|
          c.syntax "jekyll load data"
          c.description "Runs the RISM Catalogue Theme helper script."

          c.option "verbose", "--verbose", "Show more output"

          c.action do |_args, _options|
            Jekyll.logger.info "RISM:", "Running load data..."

            @docs = []

            site = Jekyll::Site.new(Jekyll.configuration({}))
            if !site.config["rism_catalogue"]
              Jekyll.logger.error "rism_catalogue is missing in the configuration"
              exit
            end

            start_url = "https://rism.online/#{site.config["rism_catalogue"]}/works"

            FileUtils.mkdir_p("index")
            FileUtils.mkdir_p("incipits")

            # Start processing paginated results
            iterate_paginated_results(start_url)

            File.write("index/index.json", @docs.to_json)
          end
        end
      end

      # Method to fetch and parse JSON-LD data from RISM Online
      def self.fetch_json_ld(url)
        uri = URI(url)
        request = Net::HTTP::Get.new(uri)
        # Set the Accept header to request JSON-LD
        request["Accept"] = "application/ld+json"

        response = Net::HTTP.start(uri.hostname, uri.port, use_ssl: uri.scheme == "https") do |http|
          http.request(request)
        end

        if response.is_a?(Net::HTTPSuccess)
          JSON.parse(response.body)
        else
          Jekyll.logger.warning "Failed to retrieve data from #{url}: #{response.code} #{response.message}"
          nil
        end
      end

      # Method to iterate through JSON-LD data["items"] and to add them to the document list
      def self.iterate_json_ld(data)
        data.each do |value|
          Jekyll.logger.info "Processing work #{value["id"]}"
          item = fetch_json_ld(value["id"])
          load_json_ld(item)
        end
      end

      # Method to transform a JSON-LD work into an index document
      def self.load_json_ld(value)
        extractor = WorkExtractor.new(value)
        doc = extractor.index_doc

        svg_data = extractor.incipit_svg
        if svg_data
          filename = extractor.incipit_filename
          File.write("incipits/%s.svg" % filename, svg_data)
        end

        @docs << doc
      end

      # Method to iterate through paginated results
      def self.iterate_paginated_results(start_url)
        current_url = start_url

        loop do
          data = fetch_json_ld(current_url)

          # Process the items in the current page
          Jekyll.logger.info "Processing items from #{current_url}:"
          iterate_json_ld(data["items"])

          # Check if there is a next page
          if data["view"]["next"]
            current_url = data["view"]["next"]
          else
            break
          end
        end
      end
    end
  end
end
