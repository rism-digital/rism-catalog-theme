# Jekyll theme for RISM catalogues

A Jekyll theme designed for building work catalogue publication sites for the RISM

It includes:
- **Jekyll theme gem** to use via `_config.yml`
- **Multilingual support** via YAML locale files
- **Built-in search** using FlexSearch for client-side indexing
- **Configurable footers** for sponsor logos
- **SCSS variables** for visual customization

The theme depends on [jekyll-rism-online-renderer](https://github.com/rism-digital/rism-online-renderer) for rendering work pulled from the RISM Online API and on [jekyll-polyglot](https://github.com/untra/polyglot) for the internationalization.

## Installation

Add this to the Jekyll site's `Gemfile`:

```ruby
group :jekyll_plugins do
  gem "rism-catalogue-theme", git: 'https://github.com/rism-digital/rism-catalogue-theme'
  gem "jekyll-rism-online-renderer", git: 'https://github.com/rism-digital/rism-online-renderer'  
  gem "jekyll-polyglot"
end
```

And add this line to `_config.yml`:

```yaml
theme: rism-catalogue-theme
```

And then execute:

```bash
bundle install
```

### Configuring

If the site will not be accessible under the root or the domain, you need to add a `baseurl` in `_config.yaml, (e.g.):
```yaml
baseurl: "/catalogue-name"
```

The footer can be configured to display sponsors. For example:

```yaml
sponsors:
  - url: https://www.musicology.org/
    logo: logo_ims.png
  - url: https://www.iaml.info/
    logo: logo_iaml.png
```

Logo images have to be placed in `./images/footer`

## RISM Online works

The work catalogue has to be specified in `_config.yml` with the corresponding RISM Online publication ID, (e.g.):
```yaml
rism_catalogue: "publications/30025296"
```

The indexing of the catalogue is triggered with the theme plugin command:

```bash
bundle exec jekyll load-data
```

This generates a `index/index.json` file and an `index/keyMode.json` file. The latter is an example of how to index data for a facet.

The data index for the search is:
* the label (title)
* the incipit text(s)
* the catalog number
* the key mode
* the scoring summary

The script also populates the `incipits/` directory with an incipit svg file of each work (when available).

### Facet configuration

Facets are shown by default. To exclude one or more facets in a site using this theme, add `_data/search_config.yml`:

```yaml
exclude:
  - keyMode
```

`exclude` is a YAML list of facet keys. If the file is missing, empty, or the list does not contain a facet key, that facet is displayed.

## Pages and side panel for the search

The search page is expected to have a permalink `/search.html`. A `/search.en.md` file will as simple as:
```yaml
---
title: Works
layout: search
lang: en
sideleft: true
permalink: /search.html
---

{% include search.html %}
```

The site is also expected to have a `_includes/sidepanels/search.en.md` file with (at least):

```yaml
{% include sidepanels/search.html %}
``` 

No translation of the search page and the side panel page is required because the search page looks at the `site.active_lang` value.

### Internationalization

Label translations for the search are not included in the theme but are expected to be given in the `_data/locales.yml` file of the website. The list of keys are:
* search-title
* search-results
* search-input
* search-results-count
* search-no-result
* search-no-query
* search-facet1

## Development

To set up your environment to develop this theme, run `bundle install`.

Your theme is setup just like a normal Jekyll site. To test your theme, run `bundle exec jekyll serve --baseurl=""` and open your browser at `http://localhost:4000`. This starts a Jekyll server using your theme. Add pages, documents, data, etc. like normal to test your theme's contents. As you make modifications to your theme and to your content, your site will regenerate and you should see the changes in the browser after a refresh, just like normal.

When your theme is released, only the files in `_layouts`, `_includes`, `_sass` and `assets` tracked with Git will be bundled.

## License

The theme is available as open source under the terms of the [MIT License](https://opensource.org/licenses/MIT).
