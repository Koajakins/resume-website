const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const { feedPlugin } = require("@11ty/eleventy-plugin-rss");
const { HtmlBasePlugin } = require("@11ty/eleventy");

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(HtmlBasePlugin);
  eleventyConfig.addPlugin(syntaxHighlight);
  eleventyConfig.addPlugin(feedPlugin, {
    type: "atom",
    outputPath: "/feed.xml",
    collection: { name: "publicPosts", limit: 10 },
    metadata: {
      language: "en",
      title: "Thomas Haggath — AWS Security Writing",
      subtitle: "Writing on AWS security, threat detection, and cloud defence.",
      base: "https://www.haggath.re/blog/",
      author: { name: "Thomas Haggath" }
    }
  });
  eleventyConfig.addFilter("readableDate", (date) =>
    new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
  );
  eleventyConfig.addFilter("htmlDateString", (date) =>
    new Date(date).toISOString().split("T")[0]
  );
  eleventyConfig.addFilter("isoDateString", (date) =>
    new Date(date).toISOString()
  );
  eleventyConfig.addFilter("readingTime", (content) => {
    const words = content.replace(/<[^>]+>/g, "").split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
  });
  // Pass through shared assets from root
  eleventyConfig.addPassthroughCopy({ "../style.css": "style.css" });
  eleventyConfig.addPassthroughCopy({ "../fonts": "fonts" });
  eleventyConfig.addPassthroughCopy({ "../favicon.svg": "favicon.svg" });
  eleventyConfig.addPassthroughCopy({ "../apple-touch-icon.png": "apple-touch-icon.png" });
  eleventyConfig.addPassthroughCopy({ "src/htaccess": ".htaccess" });

  eleventyConfig.addCollection("posts", function (collectionApi) {
    return collectionApi
      .getFilteredByGlob("./src/posts/*.md")
      .sort((a, b) => b.date - a.date);
  });

  eleventyConfig.addCollection("publicPosts", function (collectionApi) {
    return collectionApi
      .getFilteredByGlob("./src/posts/*.md")
      .filter(post => !post.data.noindex)
      .sort((a, b) => b.date - a.date);
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
    },
    pathPrefix: "/blog/",
  };
};
