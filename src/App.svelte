<script>
import { onMount } from 'svelte';

let d = new Date();
const date = d.getDate();

$: hour = d.getHours();
$: min = d.getMinutes();
$: sec = d.getSeconds();
let dayOrNight = 'AM';

let day;

onMount( () => {
	const interval = setInterval(() => {
		d = new Date();
		dayOrNight = (hour >= 12) ? "pm" : "am";
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
	<img src="clockfinal.png" />
	<div class="date">{day}.<span style="margin-left: 16px;">{date}</span></div>
	<div class="date time">{hour} : {min} : {sec}</div>
</main>

<style>
	main {
		/*text-align: center;*/
		/*padding: 1em;*/
		/*margin: 0 auto;*/
	}
	
	.date{
		color: #320f02;
		position: absolute;
		top: 0;
		left: 0;
		margin-left: 118px;
		font-size: 46px;
		margin-top: 14px;
		font-family: valley;
		text-shadow: -2px 3px 0px rgba(233, 161, 92, 1);
		opacity: 0.9electron-;
	}

	.time{

		font-size: 46px;
		margin-top: 100px;
	}
</style>