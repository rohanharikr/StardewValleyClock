<script>
import { onMount } from 'svelte';

let d = new Date();
const date = d.getDate();

$: hour = d.getHours();
$: min = d.getMinutes();
$: sec = d.getSeconds();
let dayOrNight = 'AM';
let showSun = null

let day;

onMount( () => {
	const interval = setInterval(() => {
		d = new Date();
		dayOrNight = (hour >= 12) ? "pm" : "am";

		if(hour >= 19 && hour <= 6){
			showSun = true
		} else{
			showSun = false
		}

	}, 1000);
});

switch (d.getDay()) {
	case 0:
	day ="Sun"

	case 1:
	day ="Mon"

	case 2:
	day ="Tue"

	case 3:
	day ="Wed"

	case 4:
	day ="Thu"

	case 5:
	day ="Fri"

	case 6:
	day ="Sat"

}

</script>

<main>
	<img src={showSun ? "morning.png" : "night.png"} id="sunandmoon" />
	<!-- <img src="morning.png" id="test" /> -->
	<img src="clockfinal.png" />
	<div class="date">{day}.<span style="margin-left: 16px;">{date}</span></div>
	<div class="date time">{hour} : {min.toString().length === 1 ? "0" : ""}{min} : {sec.toString().length === 1 ? "0" : ""}{sec}</div>
</main>

<style>

	#sunandmoon{
		position: absolute;
		transition: 0.2s;
	}
	
	.date{
		color: #320f02;
		position: absolute;
		top: 0;
		left: 0;
		margin-left: 112px;
		font-size: 46px;
		margin-top: 14px;
		font-family: valley;
		text-shadow: -2px 3px 0px rgba(233, 161, 92, 1);
		opacity: 0.9;
	}

	.time{

		font-size: 46px;
		margin-top: 100px;
	}
</style>