require "jekyll"
require 'json'
require 'net/http'
require 'uri'
require 'csv'

module Jekyll
  module RismCatalogueTheme
    class LoadData < Command

      @docs = []
      # the map for index => original instrument values
      @keyMode_map = {}

      def self.init_with_program(prog)
        prog.command("load-data".to_sym) do |c|
          c.syntax "jekyll load data"
          c.description "Runs the RISM Catalogue Theme helper script."

          c.option "verbose", "--verbose", "Show more output"

          c.action do |args, options|
            Jekyll.logger.info "RISM:", "Running load data..."
            # Your script logic goes here
            # You can load Jekyll config if needed:
            site = Jekyll::Site.new(Jekyll.configuration({}))
            # Example logic:
            if ! site.config["rism_catalogue"]
              Jekyll.logger.error "rism_catalogue is missing in the configuration"
              exit
            end

            start_url = "https://rism.online/#{site.config["rism_catalogue"]}/works"

            # Start processing paginated results
            iterate_paginated_results(start_url)

            File.write("index/index.json", @docs.to_json)
            File.write("index/keyMode.json", @keyMode_map.to_json)
          end
        end
      end
    
      def self.normalize_facet(s)
        s.rstrip.gsub(/[()]/, '').gsub(/[ -]/, '_')
      end

      # Method to fetch and parse JSON-LD data from RISM Online
      def self.fetch_json_ld(url)
          uri = URI(url)
          request = Net::HTTP::Get.new(uri)
          # Set the Accept header to request JSON-LD
          request['Accept'] = 'application/ld+json'
          # Authentication for dev.rism.online
          # request.basic_auth("rism", "rism")
          response = Net::HTTP.start(uri.hostname, uri.port, use_ssl: uri.scheme == 'https') do |http|
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
      def self.iterate_json_ld(data, indent = 0)
          data.each_with_index do |value, index|
              item = fetch_json_ld(value["id"])
              load_json_ld(item)
          end
      end

      # Method to iterate through JSON-LD data["items"] and to add them to the document list
      def self.load_json_ld(value)
            doc = {}
            doc["id"] = value["id"]

            summary = normalized_summary(value["summary"])

            doc["title"] = value.dig("label", "none", 0)

            text_incipit_field = summary_field(summary, "textIncipit", "Text incipit")
            doc["textIncipit"] = all_values(text_incipit_field)

            primary_part = value.dig("partOf", "items")&.find do |item|
              item["relationshipType"] == "rism:PrimaryPartOf"
            end

            doc["catalogNumber"] = primary_part["workNumber"] if primary_part

            key_mode_field = summary_field(summary, "keyMode", "Key or mode")
            key_mode = value.dig("flags", "keyMode", "en", 0) || first_value(key_mode_field, ["en", "none"])
            if key_mode
              norm_key_mode = normalize_facet(key_mode)
              @keyMode_map[norm_key_mode] = key_mode.rstrip
              doc["keyMode"] = norm_key_mode
            end

            scoring_field = summary_field(summary, "scoringSummary", "Scoring summary")
            doc["scoringSummary"] = value.dig("flags", "scoringSummary") || first_value(scoring_field)

            if value["rendered"].is_a?(Hash) && value["rendered"]["format"] == "image/svg+xml"
              filename = value["id"][/([^\/]+)$/]
              File.write("incipits/%s.svg" % filename, value["rendered"]["data"])
              doc["incipit"] = filename
            end

            incipit_item = value.dig("incipits", "items")&.first
            svg_rendering = incipit_item&.dig("rendered")&.find { |r| r["format"] == "image/svg+xml" }

            if svg_rendering
              filename = value["id"][/([^\/]+)$/]
              File.write("incipits/%s.svg" % filename, svg_rendering["data"])
              doc["incipit"] = filename
            end
            @docs << doc
      end

      def self.normalized_summary(summary, lang = "en")
        return {} unless summary

        case summary
        when Hash
          summary
        when Array
          summary.each_with_object({}) do |item, acc|
            key =
              item["name"] ||
              item["id"] ||
              item.dig("label", lang, 0) ||
              item.dig("label", "none", 0)

            acc[key] = item if key
          end
        else
          {}
        end
      end

      def self.summary_field(summary, *keys)
        keys.each do |key|
          return summary[key] if summary[key]
        end
        nil
      end

      def self.first_value(field, preferred_langs = ["none", "en"])
        return nil unless field.is_a?(Hash)
        value = field["value"]
        return nil unless value.is_a?(Hash)

        preferred_langs.each do |lang|
          vals = value[lang]
          return vals[0] if vals.is_a?(Array) && vals[0]
        end

        nil
      end

      def self.all_values(field, preferred_langs = ["none", "en"])
        return nil unless field.is_a?(Hash)
        value = field["value"]
        return nil unless value.is_a?(Hash)

        preferred_langs.each do |lang|
          vals = value[lang]
          return vals if vals.is_a?(Array) && !vals.empty?
        end

        nil
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