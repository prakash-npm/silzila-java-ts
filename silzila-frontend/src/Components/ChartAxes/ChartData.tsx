// This component houses the dropzones for table fields
// Number of dropzones and its name is returned according to the chart type selected.
// Once minimum number of fields are met for the given chart type, server call is made to get chart data and saved in store

import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import ChartsInfo from "./ChartsInfo2";
import DropZone from "./DropZone";
import LoadingPopover from "../CommonFunctions/PopOverComponents/LoadingPopover";
import { Dispatch } from "redux";
import { updateChartData } from "../../redux/ChartPoperties/ChartControlsActions";
import { canReUseData, toggleAxesEdited } from "../../redux/ChartPoperties/ChartPropertiesActions";
import FetchData from "../ServerCall/FetchData";
import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import { AxesValuProps, ChartAxesFormattedAxes, ChartAxesProps } from "./ChartAxesInterfaces";
import {
	ChartPropertiesProps,
	ChartPropertiesStateProps,
} from "../../redux/ChartPoperties/ChartPropertiesInterfaces";
import { TabTileStateProps, TabTileStateProps2 } from "../../redux/TabTile/TabTilePropsInterfaces";

import { isLoggedProps } from "../../redux/UserInfo/IsLoggedInterfaces";
import {chartFilterGroupEdited} from "../../redux/ChartFilterGroup/ChartFilterGroupStateActions";
import {ChartFilterGroupProps, ChartFilterGroupStateProps} from "../../redux/ChartFilterGroup/ChartFilterGroupInterface";
import {dashBoardFilterGroupsEdited} from '../../redux/DashBoardFilterGroup/DashBoardFilterGroupAction';
import {DashBoardFilterGroupStateProps} from '../../redux/DashBoardFilterGroup/DashBoardFilterGroupInterface';

import { TileRibbonProps, TileRibbonStateProps } from "../../Components/TabsAndTiles/TileRibbonInterfaces";



// format the chartAxes into the way it is needed for api call
export const getChartData = async (
	axesValues: AxesValuProps[],
	chartProp: ChartPropertiesProps,
	chartGroup:ChartFilterGroupProps,
	dashBoardGroup:any,
	propKey: string,
	screenFrom:string,
	token: string,
	forQueryData?: boolean
) => {
	/*	PRS 21/07/2022	Construct filter object for service call */
	const getChartLeftFilter = (filters:any) => {
		let _type: any = {};

		//let _chartProp = chartProp.properties[propKey].chartAxes[0];
		let _chartProp = filters;

		_type.panelName = "chartFilters";
		_type.shouldAllConditionsMatch = !_chartProp.any_condition_match;
		_type.filters = [];

		/*	To determine filter type	*/
		const _getFilterType = (item: any) => {
			let _type = "";

			switch (item.dataType) {
				case "integer":
				case "decimal":
					_type = "number";
					break;
				case "timestamp":
				case "date":
					_type = "date";
					break;
				default:
					_type = "text";
					break;
			}

			return _type.concat(
				"_",
				item.fieldtypeoption === "Search Condition" ? "search" : "user_selection"
			);
		};

		/*	Set User Selection property */
		const _getUserSelection = (item: any) => {
			if (item.fieldtypeoption === "Search Condition") {
				if (
					item.exprType === "between" &&
					(item.greaterThanOrEqualTo || item.lessThanOrEqualTo)
				) {
					return [item.greaterThanOrEqualTo, item.lessThanOrEqualTo];
				} else if (item.exprInput) {
					return [item.exprInput];
				} else {
					return [""];
				}
			} else {
				return item.userSelection;
			}
		};

		const _isInvalidValue = (val: any) => {
			if (val === undefined || val === null || val === "") {
				return true;
			}

			return false;
		};

		/*	Determine whether to add a particular field	*/
		const _getIsFilterValidToAdd = (item: any) => {
			if (!item.fieldtypeoption) {
				return false;
			}

			if (
				item.fieldtypeoption === "Pick List" &&
				item.userSelection &&
				item.userSelection.length > 0
			) {
				return !item.userSelection.includes("(All)");
			} else if (item.fieldtypeoption === "Search Condition") {
				//   if (
				//     item.exprType === "between" &&
				//     item.greaterThanOrEqualTo &&
				//     item.lessThanOrEqualTo &&
				//     item.rawselectmembers?.length > 0
				//   ) {
				//     if (
				//       item.greaterThanOrEqualTo <= item.rawselectmembers[1] &&
				//       item.lessThanOrEqualTo >= item.rawselectmembers[item.rawselectmembers.length - 1]
				//     ){
				//       return false;
				// 	}
				//   } else

				if (
					item.exprType === "between" &&
					(_isInvalidValue(item.greaterThanOrEqualTo) ||
						_isInvalidValue(item.lessThanOrEqualTo))
				) {
					return false;
				} else if (item.exprType !== "between" && _isInvalidValue(item.exprInput)) {
					return false;
				}
			} else {
				return false;
			}

			return true;
		};

		let _items = [];

		if(_chartProp.fields)
			_items = _chartProp.fields
			else
			_items = _chartProp

		/*	Iterate through each fileds added in the Filter Dropzone	*/
		_items.forEach((item: any) => {
			let _filter: any = {};
			_filter.filterType = _getFilterType(item);
			_filter.tableId = item.tableId;
			_filter.fieldName = item.fieldname;
			_filter.dataType = item.dataType.toLowerCase();
			_filter.shouldExclude = item.includeexclude === "Exclude";

			if (item.fieldtypeoption === "Search Condition") {
				if (item.exprType) {
					_filter.operator = item.exprType;
				} else {
					_filter.operator = item.dataType === "text" ? "begins_with" : "greater_than";
				}
			} else {
				_filter.operator = "in";
			}

			if (item.dataType === "timestamp" || item.dataType === "date") {
				_filter.timeGrain = item.prefix;
			}

			_filter.userSelection = _getUserSelection(item);

			if (_getIsFilterValidToAdd(item)) {
				_type.filters.push(_filter);
			}
		});

		return _type;
	};

	/*	PRS 21/07/2022 */

	var formattedAxes: ChartAxesFormattedAxes = {};
	axesValues.forEach((axis: AxesValuProps) => {
		var dim = "";
		switch (axis.name) {
			case "Filter":
				dim = "filters";
				break;

			case "Dimension":
			case "Date":
			case "Row":
			case "Column":
				dim = "dimensions";
				break;

			case "Location":
				dim = "dims";
				break;

			case "Measure":
				dim = "measures";
				break;

			case "X":
				dim = "measures";
				break;

			case "Y":
				dim = "measures";
				break;
		}

		var formattedFields: any = [];

		axis.fields.forEach((field: any) => {
			var formattedField: any = {
				tableId: field.tableId,
				displayName: field.displayname,
				fieldName: field.fieldname,
				dataType: field.dataType.toLowerCase(),
			};
			if (field.dataType === "date" || field.dataType === "timestamp") {
				formattedField.timeGrain = field.timeGrain;
			}

			if (axis.name === "Measure") {
				formattedField.aggr = field.agg;
			}

			formattedFields.push(formattedField);
		});
		formattedAxes[dim] = formattedFields;
	});

	formattedAxes.fields = [];

	if (
		chartProp.properties[propKey].chartType === "funnel" ||
		chartProp.properties[propKey].chartType === "gauge" ||
		chartProp.properties[propKey].chartType === "simplecard"
	) {
		formattedAxes.dimensions = [];
	}

	formattedAxes.filterPanels = [];

	/*	PRS 21/07/2022	Get filter object and pushed to request body object	*/

	let _filterZoneFields = chartProp.properties[propKey].chartAxes[0].fields;
	let _hasInvalidFilterData = _filterZoneFields.filter((field: any) => field.isInValidData);

	if (_filterZoneFields.length > 0 && _hasInvalidFilterData && _hasInvalidFilterData.length > 0) {
		console.log("Filter has invalid data.");
	} else {
		let _filterObj = getChartLeftFilter(chartProp.properties[propKey].chartAxes[0]);

		if (_filterObj.filters.length > 0) {
			formattedAxes.filterPanels.push(_filterObj);
		} else {
			formattedAxes.filterPanels = [];
		}

		//chartGroup
		chartGroup.tabTile[propKey]?.forEach((grp:any)=>{
			let rightFilterObj = getChartLeftFilter(chartGroup.groups[grp].filters);

			if (rightFilterObj.filters.length > 0) {
				formattedAxes.filterPanels.push(rightFilterObj);
			}
		})

		if(screenFrom === "Dashboard"){
			dashBoardGroup.groups.forEach((grp:string)=>{

				if(dashBoardGroup.filterGroupTabTiles[grp].includes(propKey)){ ////Check this condition 1. group check if cont 2. propkey

					let rightFilterObj = getChartLeftFilter(chartGroup.groups[grp].filters);

					if (rightFilterObj.filters.length > 0) {
						formattedAxes.filterPanels.push(rightFilterObj);
					}
				}
			});
		}

		var url: string = "";
		if (chartProp.properties[propKey].selectedDs.isFlatFileData) {
			url = `query?datasetid=${chartProp.properties[propKey].selectedDs.id}`;
		} else {
			url = `query?dbconnectionid=${chartProp.properties[propKey].selectedDs.connectionId}&datasetid=${chartProp.properties[propKey].selectedDs.id}`;
		}

		/*	PRS 21/07/2022	*/
		var res: any = await FetchData({
			requestType: "withData",
			method: "POST",
			url: url,
			headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
			data: formattedAxes,
		});

		if (res.status) {
			if (res.data && res.data.length > 0) {
				if (forQueryData) {
					return formattedAxes;
				} else {
					return res.data;
				}
			} else {
				console.log("Change filter conditions.");
			}
		} else {
			console.error("Get Table Data Error", res.data.message);
		}
	}
};

// given chart type, check if the dropzones have required number of fields

export const checkMinRequiredCards = (chartProp: any, _propKey: string) => {
	var minReqMet = [];
	ChartsInfo[chartProp.properties[_propKey].chartType].dropZones.forEach(
		(zone: any, zoneI: number) => {
			chartProp.properties[_propKey].chartAxes[zoneI].fields.length >= zone.min

				? minReqMet.push(true)
				: minReqMet.push(false);
		}
	);


	if (chartProp.properties[_propKey].chartType === "crossTab") {
		if (
			chartProp.properties[_propKey].chartAxes[1].fields.length > 0 ||
			chartProp.properties[_propKey].chartAxes[2].fields.length > 0 ||
			chartProp.properties[_propKey].chartAxes[3].fields.length > 0

		) {
			minReqMet.push(true);
		} else {
			minReqMet.push(false);
		}
	}

	if (minReqMet.includes(false)) {
		return false;
	} else {
		return true;
	}
};


const ChartData = ({
	// props
	tabId,
	tileId,
	screenFrom,

	// state
	token,
	tabTileProps,

	tileState,
	tabState,

	chartProp,
	chartGroup,
	dashBoardGroup,

	// dispatch
	updateChartData,
	toggleAxesEdit,
	reUseOldData,
	chartFilterGroupEdited,
	dashBoardFilterGroupsEdited

}: ChartAxesProps & TileRibbonStateProps) => {
	const [loading, setLoading] = useState<boolean>(false);

	var _propKey: string = `${tabId}.${tileId}`;

	

	// every time chartAxes or chartType is changed, check if
	// new data must be obtained from server
	// check for minimum requirements in each dropzone for the given chart type
	// if not reset the data

	useEffect(() => {


		let showTabTile = false;

		const makeServiceCall = (_tabTile:string)=>{
			const axesValues = JSON.parse(JSON.stringify(chartProp.properties[_tabTile].chartAxes));

			//console.log(prevFilter);
	
			/*	To sort chart data	based on field name	*/
			const sortChartData = (chartData: any[]): any[] => {
				let result: any[] = [];
	
				if (chartData && chartData.length > 0) {
					let _zones: any = axesValues.filter((zones: any) => zones.name !== "Filter");
					//let _zonesFields:any = [];
					let _fieldTempObject: any = {};
					let _chartFieldTempObject: any = {};
	
					// _zones.forEach((zone:any)=>{
					// 	_zonesFields = [..._zonesFields, ...zone.fields]
					// });
	
					/*	Find and return field's new name	*/
					const findFieldName = (name: string, i: number = 2): string => {
						if (_fieldTempObject[`${name}(${i})`] !== undefined) {
							i++;
							return findFieldName(name, i);
						} else {
							return `${name}(${i})`;
						}
					};
	
					/*	Find and return field's new name	*/
					const findFieldIndexName = (name: string, i: number = 2): string => {
						if (_chartFieldTempObject[`${name}_${i}`] !== undefined) {
							i++;
							return findFieldIndexName(name, i);
						} else {
							return `${name}_${i}`;
						}
					};
	
					_zones.forEach((zoneItem: any) => {
						zoneItem.fields.forEach((field: any, index: number) => {
							let _nameWithAgg: string = "";
	
							if (zoneItem.name === "Measure") {
								if (field.dataType !== "date" && field.dataType !== "timestamp") {
									_nameWithAgg = field.agg
										? `${field.agg} of ${field.fieldname}`
										: field.fieldname;
								} else {
									let _timeGrain: string = field.timeGrain || "";
									_nameWithAgg = field.agg
										? `${field.agg} ${_timeGrain} of ${field.fieldname}`
										: field.fieldname;
								}
							} else {
								if (field.dataType !== "date" && field.dataType !== "timestamp") {
									_nameWithAgg = field.agg
										? `${field.agg} of ${field.fieldname}`
										: field.fieldname;
								} else {
									let _timeGrain: string = field.timeGrain || "";
									_nameWithAgg = _timeGrain
										? `${_timeGrain} of ${field.fieldname}`
										: field.fieldname;
								}
							}
	
							if (_chartFieldTempObject[field.fieldname] !== undefined) {
								let _name = findFieldIndexName(field.fieldname);
	
								field["NameWithIndex"] = _name;
								_chartFieldTempObject[_name] = "";
							} else {
								field["NameWithIndex"] = field.fieldname;
								_chartFieldTempObject[field.fieldname] = "";
							}
	
							if (_fieldTempObject[_nameWithAgg] !== undefined) {
								let _name = findFieldName(_nameWithAgg);
	
								field["NameWithAgg"] = _name;
								_fieldTempObject[_name] = "";
							} else {
								field["NameWithAgg"] = _nameWithAgg;
								_fieldTempObject[_nameWithAgg] = "";
							}
						});
					});
	
					chartData.forEach((data: any) => {
						let _chartDataObj: any = {};
	
						_zones.forEach((zoneItem: any) => {
							zoneItem.fields.forEach((field: any) => {
								_chartDataObj[field.NameWithAgg] = data[field.NameWithIndex];
							});
						});
	
						result.push(_chartDataObj);
					});
				}
	
				return result;
			};

			let serverCall = false;

			if (chartProp.properties[_tabTile].axesEdited || chartGroup.chartFilterGroupEdited || dashBoardGroup.dashBoardGroupEdited || 
					tabTileProps.showDash || showTabTile) {

				if (chartProp.properties[_tabTile].reUseData) {
					serverCall = false;
				} else {
					var minReq = checkMinRequiredCards(chartProp, _tabTile);
					if (minReq) {
						serverCall = true;
					} else {
						updateChartData(_tabTile, "");
					}
				}
			}
	
			if (chartProp.properties[_tabTile].chartType === "scatterPlot") {
				var combinedValuesForMeasure = { name: "Measure", fields: [] };
				var values1 = axesValues[2].fields;
				var values2 = axesValues[3].fields;
				var allValues = values1.concat(values2);
				combinedValuesForMeasure.fields = allValues;
				axesValues.splice(2, 2, combinedValuesForMeasure);
			}
	
			if (
				chartProp.properties[_tabTile].chartType === "heatmap" ||
				chartProp.properties[_tabTile].chartType === "crossTab" ||
				chartProp.properties[_tabTile].chartType === "boxPlot"
			) {
				var combinedValuesForDimension = { name: "Dimension", fields: [] };
				var values1 = axesValues[1].fields;
				var values2 = axesValues[2].fields;
				var allValues = values1.concat(values2);
				combinedValuesForDimension.fields = allValues;
				axesValues.splice(1, 2, combinedValuesForDimension);
			}
	
			if (
				chartProp.properties[_tabTile].chartType === "table"
			) {
				var combinedValuesForDimension = { name: "Dimension", fields: [] };
				// var values1 = axesValues[1].fields;
				// var values2 = axesValues[2].fields;
				// var allValues = values1.concat(values2);
				combinedValuesForDimension.fields = axesValues[1].fields;
	
				if(axesValues.length == 4){
					axesValues.splice(1, 2, combinedValuesForDimension);
				}
				else if(axesValues.length == 3){
					axesValues.splice(1, 1, combinedValuesForDimension);
				}
			}
	
			if (serverCall) {
				setLoading(true);
				getChartData(axesValues, chartProp, chartGroup, dashBoardGroup, _tabTile, screenFrom, token).then(data => {
					updateChartData(_tabTile, sortChartData(data));
					setLoading(false);
					showTabTile = false;
				});
			}
		}

		const _checkGroupsNotSame = (_tabTile:string) => {
			if(tabState.tabs[tabTileProps.selectedTabId].tilesInDashboard.includes(_tabTile) && dashBoardGroup.groups.length > 0){
				let _tileGroups = chartGroup.tabTile[_tabTile];
				let _count = 0;
	
				if(_tileGroups){
					_tileGroups.forEach((grp:string)=>{
						//if(chartGroup.groups[grp].filters.length > 0){
						let _attachedTabTiles = dashBoardGroup.filterGroupTabTiles[grp];
	
						if(_attachedTabTiles){
							_count += _attachedTabTiles.includes(_tabTile) ? 1 : 0;
						}
						else{
							_count = 999;
						}
						// }
						// else{
						// 	return true;
						// }
					})
		
					if(_count > 0){
						return _count == _tileGroups.length;
					}
					else{
						return true;
					}
				}
				else{
					return true;
				}
			}
			else{
				return true;
			}
		}

		if(screenFrom === "Dashboard"){
			[...tileState.tileList[tabTileProps.selectedTabId]].forEach(tile=>{
				if(!_checkGroupsNotSame(tile) || chartProp.properties[tile].axesEdited || chartGroup.chartFilterGroupEdited || dashBoardGroup.dashBoardGroupEdited){
					makeServiceCall(tile);
				}
			});
		}
		else{
			if(((tabTileProps.previousTabId == 0 || tabTileProps.previousTileId == 0) &&  !_checkGroupsNotSame(_propKey)) 
				|| chartProp.properties[_propKey].axesEdited || chartGroup.chartFilterGroupEdited || dashBoardGroup.dashBoardGroupEdited){
				showTabTile = true;
				makeServiceCall(_propKey);
			}
		}

		resetStore();
	}, [
		chartProp.properties[_propKey].chartAxes,
		chartProp.properties[_propKey].chartType,
		chartProp.properties[_propKey].filterRunState,

		chartGroup.chartFilterGroupEdited,
		dashBoardGroup.dashBoardGroupEdited,
		tabTileProps.showDash
	]);

	const resetStore = () => {

		toggleAxesEdit(_propKey);
		reUseOldData(_propKey);

		chartFilterGroupEdited(false);
		dashBoardFilterGroupsEdited(false);
	};



	return (
		<div className="charAxesArea">
			{loading ? <LoadingPopover /> : null}
		</div>
	);
};


const mapStateToProps = (state: ChartPropertiesStateProps & TabTileStateProps2 & TileRibbonStateProps & isLoggedProps & ChartFilterGroupStateProps & DashBoardFilterGroupStateProps, ownProps: any) => {
	return {
		tabTileProps: state.tabTileProps,
		tileState: state.tileState,
		tabState: state.tabState,

		// userFilterGroup: state.userFilterGroup,
		chartProp: state.chartProperties,
		token: state.isLogged.accessToken,
		chartGroup: state.chartFilterGroup,
		dashBoardGroup: state.dashBoardFilterGroup,
	};
};

const mapDispatchToProps = (dispatch: Dispatch<any>) => {
	return {
		updateChartData: (propKey: string, chartData: any) =>
			dispatch(updateChartData(propKey, chartData)),
		toggleAxesEdit: (propKey: string) => dispatch(toggleAxesEdited(propKey, false)),
		reUseOldData: (propKey: string) => dispatch(canReUseData(propKey, false)),
	chartFilterGroupEdited:(isEdited : boolean) =>
		dispatch(chartFilterGroupEdited(isEdited)),
		dashBoardFilterGroupsEdited:(isEdited : boolean) =>
		dispatch(dashBoardFilterGroupsEdited(isEdited))
	};
};

export default connect(mapStateToProps, mapDispatchToProps)(ChartData);