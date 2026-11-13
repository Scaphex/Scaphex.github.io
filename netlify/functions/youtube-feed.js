// Netlify Function: fetch the public uploads feed for @scaphex without a YouTube API key.
exports.handler = async function () {
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "public, max-age=300"
  };

  try {
    const channelResponse = await fetch("https://www.youtube.com/@scaphex", {
      headers: { "user-agent": "Mozilla/5.0 (compatible; ScaphexSite/1.0)" }
    });
    if (!channelResponse.ok) throw new Error("Could not resolve the YouTube channel");
    const channelHtml = await channelResponse.text();
    const idMatch = channelHtml.match(/"channelId"\s*:\s*"(UC[a-zA-Z0-9_-]{22})"/)
      || channelHtml.match(/"externalId"\s*:\s*"(UC[a-zA-Z0-9_-]{22})"/);
    if (!idMatch) throw new Error("YouTube channel ID was not present in the channel page");

    const feedResponse = await fetch(
      "https://www.youtube.com/feeds/videos.xml?channel_id=" + encodeURIComponent(idMatch[1]),
      { headers: { "user-agent": "Mozilla/5.0 (compatible; ScaphexSite/1.0)" } }
    );
    if (!feedResponse.ok) throw new Error("Could not retrieve the YouTube uploads feed");
    const xml = await feedResponse.text();
    const videos = Array.from(xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)).slice(0, 6).map(match => {
      const entry = match[1];
      const read = pattern => {
        const found = entry.match(pattern);
        return found ? found[1].replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&apos;/g, "'") : "";
      };
      const videoId = read(/<yt:videoId>([^<]+)<\/yt:videoId>/);
      return {
        videoId,
        title: read(/<title>([\s\S]*?)<\/title>/),
        publishedAt: read(/<published>([^<]+)<\/published>/),
        thumbnail: videoId ? "https://i.ytimg.com/vi/" + videoId + "/hqdefault.jpg" : ""
      };
    }).filter(video => video.videoId);

    return { statusCode: 200, headers, body: JSON.stringify({ videos }) };
  } catch (error) {
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: "YouTube uploads are temporarily unavailable" })
    };
  }
};
