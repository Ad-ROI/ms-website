<?php
/**
 * MindStream Tracking Codes
 * Embeds third-party tracking/consent scripts in <head>
 */

// 1. CYTRIO Cookie Consent Banner (ID: 3828, Tenant: 2337)
add_action( &#39;wp_head&#39;, function() {
    echo &#39;
<!-- CYTRIO Cookie Consent -->
&#39;;
    echo &#39;<script class="cytrio-script" src="https://cytriocpmprod.blob.core.windows.net/cytrio-public/cookiescript/2337/3828/script.js"></script>
&#39;;
}, 1 );

// 2. TruConversion Heatmaps + Recordings (Site ID: 62793)
add_action( &#39;wp_head&#39;, function() {
    echo &#39;
<!-- TruConversion for mindstream.ing -->
&#39;;
    echo &#39;<script type="text/javascript">
&#39;;
    echo &#39;    var _tip = _tip || [];
&#39;;
    echo &#39;    (function(d,s,id){
&#39;;
    echo &#39;        var js, tjs = d.getElementsByTagName(s)[0];
&#39;;
    echo &#39;        if(d.getElementById(id)) { return; }
&#39;;
    echo &#39;        js = d.createElement(s); js.id = id;
&#39;;
    echo &#39;        js.async = true;
&#39;;
    echo &#39;        js.src = d.location.protocol + "//app.truconversion.com/ti-js/62793/7aef0.js";
&#39;;
    echo &#39;        tjs.parentNode.insertBefore(js, tjs);
&#39;;
    echo &#39;    }(document, "script", "ti-js"));
&#39;;
    echo &#39;</script>
&#39;;
}, 2 );
