import * as am4charts     from "@amcharts/amcharts4/charts"
import * as am4core       from "@amcharts/amcharts4/core"
import am4themes_animated from "@amcharts/amcharts4/themes/animated"
import React, {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    useCallback
}                         from "react"

const Map = ({ data }) => {
    const chartDiv = useRef(null)

    const formatYearText = useCallback((yearText) => {
        const [year, month] = yearText.split("-")
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "July", "Aug", "Sep", "Aug", "Nov", "Dec"]

        return `${months[month] || month}, ${year}`
    }, [])

    useLayoutEffect(() => {
        /* Chart code */
        // Themes begin
        am4core.useTheme(am4themes_animated)
        // Themes end

        let chart = am4core.create(chartDiv.current, am4charts.XYChart)
        chart.padding(40, 40, 40, 40)

        chart.numberFormatter.bigNumberPrefixes = [
            { "number": 1e+3, "suffix": "K" },
            { "number": 1e+6, "suffix": "M" },
            { "number": 1e+9, "suffix": "B" },
        ]

        let label = chart.plotContainer.createChild(am4core.Label)
        label.x = am4core.percent(97)
        label.y = am4core.percent(95)
        label.horizontalCenter = "right"
        label.verticalCenter = "middle"
        label.dx = -15
        label.fontSize = 50

        let playButton = chart.plotContainer.createChild(am4core.PlayButton)
        playButton.x = am4core.percent(97)
        playButton.y = am4core.percent(95)
        playButton.dy = -2
        playButton.verticalCenter = "middle"
        playButton.events.on("toggled", function(event) {
            if (event.target.isActive) {
                play()
            } else {
                stop()
            }
        })

        let stepDuration = 4000

        let categoryAxis = chart.yAxes.push(new am4charts.CategoryAxis())
        categoryAxis.renderer.grid.template.location = 0
        categoryAxis.dataFields.category = "country"
        categoryAxis.renderer.minGridDistance = 1
        categoryAxis.renderer.inversed = true
        categoryAxis.renderer.grid.template.disabled = true

        let valueAxis = chart.xAxes.push(new am4charts.ValueAxis())
        valueAxis.min = 0
        valueAxis.rangeChangeEasing = am4core.ease.linear
        valueAxis.rangeChangeDuration = stepDuration
        valueAxis.extraMax = 0.1

        let series = chart.series.push(new am4charts.ColumnSeries())
        series.dataFields.categoryY = "country"
        series.dataFields.valueX = "value"
        series.tooltipText = "{valueX.value}"
        series.columns.template.strokeOpacity = 0
        series.columns.template.column.cornerRadiusBottomRight = 5
        series.columns.template.column.cornerRadiusTopRight = 5
        series.interpolationDuration = stepDuration
        series.interpolationEasing = am4core.ease.linear

        let labelBullet = series.bullets.push(new am4charts.LabelBullet())
        labelBullet.label.horizontalCenter = "right"
        labelBullet.label.text = "{values.valueX.workingValue.formatNumber('#.0as')}"
        labelBullet.label.textAlign = "end"
        labelBullet.label.dx = -10

        chart.zoomOutButton.disabled = true

        // as by default columns of the same series are of the same color, we add adapter which takes colors from chart.colors color set
        series.columns.template.adapter.add("fill", function(fill, target) {
            return chart.colors.getIndex(target.dataItem.index)
        })

        const years = Object.keys(data)
        let currentYearIndex = 0
        const lastYearIndex = years.length - 1
        let currentYear = years[currentYearIndex] || ""
        label.text = formatYearText(currentYear)

        let interval

        function play() {
            interval = setInterval(function() {
                nextYear()
            }, stepDuration)
            nextYear()
        }

        function stop() {
            if (interval) {
                clearInterval(interval)
            }
        }

        function nextYear() {
            currentYearIndex++

            if (currentYearIndex > lastYearIndex) {
                currentYearIndex = 0
            }

            currentYear = years[currentYearIndex]

            let newData = data[currentYear]
            let itemsWithNonZero = 0
            for (let i = 0; i < chart.data.length; i++) {
                chart.data[i].value = newData[i].value
                // if (chart.data[i].value > 0) {
                itemsWithNonZero++
                // }
            }

            if (currentYearIndex === 0) {
                series.interpolationDuration = stepDuration / 4
                valueAxis.rangeChangeDuration = stepDuration / 4
            } else {
                series.interpolationDuration = stepDuration
                valueAxis.rangeChangeDuration = stepDuration
            }

            chart.invalidateRawData()
            label.text = formatYearText(currentYear)

            categoryAxis.zoom({ start: 0, end: itemsWithNonZero / categoryAxis.dataItems.length })
        }

        categoryAxis.sortBySeries = series

        chart.data = JSON.parse(JSON.stringify(data[currentYear]))
        categoryAxis.zoom({ start: 0, end: data[currentYear].length / chart.data.length })

        series.events.on("inited", function() {
            setTimeout(function() {
                playButton.isActive = true // this starts interval
            }, 2000)
        })

        return () => {
            chart.dispose()
        }
    }, [data, formatYearText])

    return (
        <div>
            <div style={{ width: "600px", height: "400px" }} id="" ref={chartDiv}></div>
        </div>
    )
}

function App() {
    const [mapData, setMapData] = useState(null)

    useEffect(() => {
        fetch("https://admin.covid19.development.opencontracting.uk0.bigv.io/api/v1/vizualization/world-map-race/")
            .then(response => response.json())
            .then(data => {
                const formatted = data.result.reduce((formattedData, d) => ({
                    ...formattedData,
                    [d.month]: d.details.map(detail => ({
                        country: detail.country,
                        value: detail.amount_usd,
                    })),
                }), {})

                setMapData(formatted)
            })
    }, [])

    if (!mapData) {
        return "loading..."
    }

    return (
        <div className="App">
            <Map data={mapData}/>
        </div>
    )
}

export default App
