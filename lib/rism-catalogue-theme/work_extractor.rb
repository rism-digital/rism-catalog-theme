module Jekyll
  module RismCatalogueTheme
    class WorkExtractor
      def initialize(work, lang = "en")
        @work = work
        @lang = lang
        @summary = normalized_summary(@work["summary"])
      end

      def index_doc
        doc = {
          "id" => @work["id"],
          "title" => @work.dig("label", "none", 0),
          "textIncipit" => all_values(summary_field("textIncipit", "Text incipit")),
          "scoringSummary" => first_value(summary_field("scoringSummary", "Scoring summary"))
        }

        primary = primary_part
        doc["catalogNumber"] = primary["workNumber"] if primary
        doc["keyMode"] = key_mode_facet if key_mode_facet
        doc["incipit"] = incipit_filename if incipit_svg
        doc
      end

      def key_mode_label
        first_value(summary_field("keyMode", "Key or mode"), ["en", "none"])
      end

      def key_mode_facet
        label = key_mode_label
        return nil unless label

        self.class.normalize_facet(label)
      end

      def incipit_svg
        # first incipit in @work.incipits.items
        incipit_item = @work.dig("incipits", "items")&.first
        # find the .rendered with format "image/svg+xml" and return its data
        svg_rendering = incipit_item&.dig("rendered")&.find { |r| r["format"] == "image/svg+xml" }
        svg_rendering&.dig("data")
      end

      def incipit_filename
        # extract the last part of the @work["id"] after the last slash
        @work["id"][/([^\/]+)$/]
      end

      def self.normalize_facet(value)
        value.rstrip.gsub(/[()]/, "").gsub(/[ -]/, "_")
      end

      private

      def primary_part
        # find the rism:PrimaryPartOf in @work.partOf.items
        @work.dig("partOf", "items")&.find do |item|
          item["relationshipType"] == "rism:PrimaryPartOf"
        end
      end

      def normalized_summary(summary)
        return {} unless summary

        case summary
        when Hash
          summary
        when Array
          summary.each_with_object({}) do |item, acc|
            key =
              item["name"] ||
              item["id"] ||
              item.dig("label", @lang, 0) ||
              item.dig("label", "none", 0)

            acc[key] = item if key
          end
        else
          {}
        end
      end

      def summary_field(*keys)
        keys.each do |key|
          return @summary[key] if @summary[key]
        end
        nil
      end

      def first_value(field, preferred_langs = ["none", "en"])
        return nil unless field.is_a?(Hash)
        value = field["value"]
        return nil unless value.is_a?(Hash)

        preferred_langs.each do |lang|
          vals = value[lang]
          return vals[0] if vals.is_a?(Array) && vals[0]
        end

        nil
      end

      def all_values(field, preferred_langs = ["none", "en"])
        return nil unless field.is_a?(Hash)
        value = field["value"]
        return nil unless value.is_a?(Hash)

        preferred_langs.each do |lang|
          vals = value[lang]
          return vals if vals.is_a?(Array) && !vals.empty?
        end

        nil
      end
    end
  end
end
