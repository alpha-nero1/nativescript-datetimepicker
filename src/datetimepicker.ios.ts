import { Color } from "tns-core-modules/color";
import { View, ios as iosView } from "tns-core-modules/ui/core/view";
import { device } from "tns-core-modules/platform";
import {
    DateTimePickerBase, DateTimePickerStyleBase, getCurrentPage,
    DatePickerOptions, TimePickerOptions, PickerOptions
} from "./datetimepicker.common";
import { LocalizationUtils } from "./utils/localization-utils";
import { getDateNow, getDateToday } from "./utils/date-utils";

export class DateTimePickerStyle extends DateTimePickerStyleBase {
}

export class DateTimePicker extends DateTimePickerBase {
    private static readonly  SUPPORT_DATE_PICKER_STYLE = parseFloat(device.osVersion) >= 14.0;
    private static readonly  SUPPORT_TEXT_COLOR = parseFloat(device.osVersion) < 14.0;
    private static readonly  DEFAULT_DATE_PICKER_STYLE = 1;

    public static PICKER_DEFAULT_MESSAGE_HEIGHT = 192;
    public static PICKER_WIDTH_INSETS = 16;
    public static PICKER_WIDTH_PAD = 304;
    public static PICKER_DEFAULT_TITLE_OFFSET = 26.5;
    public static PICKER_DEFAULT_TITLE_HEIGHT = 16;
    public static PICKER_DEFAULT_MESSAGE = "\n\n\n\n\n\n\n\n\n";

    static pickDate(options: DatePickerOptions, style?: DateTimePickerStyle): Promise<Date> {
        const pickDate = new Promise<Date>((resolve) => {
            const nativeDatePicker = DateTimePicker._createNativeDatePicker(options);
            const nativeDialog = DateTimePicker._createNativeDialog(nativeDatePicker, options, style, (result) => {
                resolve(result);
            });
            DateTimePicker._showNativeDialog(nativeDialog, nativeDatePicker, style);
        });
        return pickDate;
    }

    static pickTime(options: TimePickerOptions, style?: DateTimePickerStyle): Promise<Date> {
        const pickTime = new Promise<Date>((resolve) => {
            const nativeTimePicker = DateTimePicker._createNativeTimePicker(options);
            const nativeDialog = DateTimePicker._createNativeDialog(nativeTimePicker, options, style, (result) => {
                resolve(result);
            });
            DateTimePicker._showNativeDialog(nativeDialog, nativeTimePicker, style);
        });
        return pickTime;
    }

    static _createNativeDatePicker(options: DatePickerOptions): UIDatePicker {
        const pickerView = UIDatePicker.alloc().initWithFrame(CGRectZero);
        pickerView.datePickerMode = UIDatePickerMode.Date;
        if (this.SUPPORT_DATE_PICKER_STYLE) {
            (pickerView as any).preferredDatePickerStyle = this.DEFAULT_DATE_PICKER_STYLE;
        }
        const date = options.date ? options.date : getDateToday();
        pickerView.date = date;
        if (options.maxDate) {
            pickerView.maximumDate = options.maxDate;
        }
        if (options.minDate) {
            pickerView.minimumDate = options.minDate;
        }
        if (options.locale) {
            pickerView.locale = LocalizationUtils.createNativeLocale(options.locale);
        }
        return pickerView;
    }

    static _createNativeTimePicker(options: TimePickerOptions): UIDatePicker {
        const pickerView = UIDatePicker.alloc().initWithFrame(CGRectZero);
        pickerView.datePickerMode = UIDatePickerMode.Time;
        if (this.SUPPORT_DATE_PICKER_STYLE) {
            (pickerView as any).preferredDatePickerStyle = this.DEFAULT_DATE_PICKER_STYLE;
        }
        const time = options.time ? options.time : getDateNow();
        pickerView.date = time;
        if (options.locale) {
            pickerView.locale = LocalizationUtils.createNativeLocale(options.locale);
        }
        return pickerView;
    }

    static _createNativeDialog(nativePicker: UIDatePicker, options: PickerOptions, style: DateTimePickerStyle, callback: Function) {
        const alertTitle = options.title ? options.title : "";
        const alertController = UIAlertController.alertControllerWithTitleMessagePreferredStyle(
            alertTitle, DateTimePicker.PICKER_DEFAULT_MESSAGE, UIAlertControllerStyle.ActionSheet);
        const alertSize = Math.min(alertController.view.frame.size.width, alertController.view.frame.size.height);
        const pickerViewWidth = UIDevice.currentDevice.userInterfaceIdiom === UIUserInterfaceIdiom.Pad ?
            DateTimePicker.PICKER_WIDTH_PAD : alertSize - DateTimePicker.PICKER_WIDTH_INSETS;

        let pickerContainerFrameTop = DateTimePicker.PICKER_DEFAULT_TITLE_OFFSET;
        if (options.title) {
            pickerContainerFrameTop += DateTimePicker.PICKER_DEFAULT_TITLE_HEIGHT;
        }
        const pickerViewHeight = DateTimePicker.PICKER_DEFAULT_MESSAGE_HEIGHT;
        const pickerContainer = UIView.alloc().init();
        let spinnersBackgroundColor = new Color("transparent");
        let spinnersTextColor = null;
        if (style) {
            spinnersBackgroundColor = style.spinnersBackgroundColor ? style.spinnersBackgroundColor : spinnersBackgroundColor;
            spinnersTextColor = style.spinnersTextColor;
        }
        DateTimePicker._applyDialogSpinnersColors(nativePicker, pickerContainer, spinnersTextColor, spinnersBackgroundColor);

        const pickerView = nativePicker;
        pickerView.frame = CGRectMake(0, 0, pickerViewWidth, pickerViewHeight);
        pickerContainer.addSubview(pickerView);
        DateTimePicker._clearVibrancyEffects(alertController.view);

        const messageLabel = DateTimePicker._findLabelWithText(alertController.view, DateTimePicker.PICKER_DEFAULT_MESSAGE);
        const messageLabelContainer = DateTimePicker._getLabelContainer(messageLabel);
        messageLabelContainer.clipsToBounds = true;
        messageLabelContainer.addSubview(pickerContainer);

        pickerContainer.translatesAutoresizingMaskIntoConstraints = false;
        pickerContainer.topAnchor.constraintEqualToAnchorConstant(alertController.view.topAnchor, pickerContainerFrameTop).active = true;
        pickerContainer.leftAnchor.constraintEqualToAnchor(alertController.view.leftAnchor).active = true;
        pickerContainer.rightAnchor.constraintEqualToAnchor(alertController.view.rightAnchor).active = true;
        pickerContainer.bottomAnchor.constraintEqualToAnchor(alertController.view.bottomAnchor).active = true;

        pickerView.leftAnchor.constraintLessThanOrEqualToAnchorConstant(pickerContainer.leftAnchor, DateTimePicker.PICKER_WIDTH_INSETS).active = true;
        pickerView.rightAnchor.constraintLessThanOrEqualToAnchorConstant(pickerContainer.rightAnchor, DateTimePicker.PICKER_WIDTH_INSETS).active = true;

        const cancelButtonText = options.cancelButtonText ? options.cancelButtonText : "Cancel";
        const okButtonText = options.okButtonText ? options.okButtonText : "OK";
        const cancelActionStyle = (style && style.buttonCancelBackgroundColor) ? UIAlertActionStyle.Default : UIAlertActionStyle.Cancel;
        let cancelAction = UIAlertAction.actionWithTitleStyleHandler(cancelButtonText, cancelActionStyle, () => {
            callback(null);
        });
        let okAction = UIAlertAction.actionWithTitleStyleHandler(okButtonText, UIAlertActionStyle.Default, () => {
            callback(pickerView.date);
        });
        alertController.addAction(okAction);
        if (cancelButtonText) {
            alertController.addAction(cancelAction);
        }
        if (style) {
            const buttonOkTextColor = style.buttonOkTextColor ? style.buttonOkTextColor : style.buttonsTextColor;
            const buttonCancelTextColor = style.buttonCancelTextColor ? style.buttonCancelTextColor : style.buttonsTextColor;
            DateTimePicker._applyDialogButtonTextColor(okAction, buttonOkTextColor);
            DateTimePicker._applyDialogButtonTextColor(cancelAction, buttonCancelTextColor);
            DateTimePicker._applyDialogTitleTextColor(alertController, style.titleTextColor);
            DateTimePicker._applyBackgroundColors(messageLabelContainer, style);
        }
        return alertController;
    }

    static _showNativeDialog(nativeDialog: UIAlertController, nativePicker: UIDatePicker, style: DateTimePickerStyle) {
        UIApplication.sharedApplication.keyWindow.rootViewController.presentViewControllerAnimatedCompletion(nativeDialog, true, null);
    }

    private static _applyDialogTitleTextColor(nativeDialog: UIAlertController, color: Color) {
        if (color) {
            if (nativeDialog.title) {
                let title = NSAttributedString.alloc().initWithStringAttributes(nativeDialog.title, <any>{ [NSForegroundColorAttributeName]: color.ios });
                nativeDialog.setValueForKey(title, "attributedTitle");
            }
        }
    }

    private static _applyDialogSpinnersColors(nativePicker: UIDatePicker, nativeContainer: UIView, color: Color, backgroundColor: Color) {
        if (backgroundColor) {
            nativeContainer.backgroundColor = backgroundColor.ios;
        }
        if (color) {
            if (this.SUPPORT_TEXT_COLOR) {
                nativePicker.setValueForKey(color, 'textColor');
            }
            nativePicker.setValueForKey(false, "highlightsToday");
        }
    }

    private static _applyDialogButtonTextColor(action: UIAlertAction, textColor: Color) {
        if (textColor) {
            action.setValueForKey(textColor.ios, "titleTextColor");
        }
    }

    private static _applyBackgroundColors(labelContainer: UIView, style: DateTimePickerStyle) {
        if (!labelContainer || !style) {
            return;
        }
        if (labelContainer.superview && labelContainer.superview.superview) {
            const mainContainer = labelContainer.superview.superview;
            if (style.dialogBackgroundColor) {
                mainContainer.backgroundColor = style.dialogBackgroundColor.ios;
            }
            const buttonsContainer = mainContainer.subviews.lastObject;
            let buttonsBackground = style.buttonCancelBackgroundColor;
            if (!buttonsBackground) {
                buttonsBackground = style.buttonOkBackgroundColor;
                if (!buttonsBackground) {
                    buttonsBackground = style.buttonsBackgroundColor;
                }
            }
            if (buttonsContainer && buttonsBackground) {
                buttonsContainer.backgroundColor = buttonsBackground.ios;
            }
        }
    }

    private static _clearVibrancyEffects(uiView: UIView) {
        if (uiView instanceof UIVisualEffectView && uiView.effect instanceof UIVibrancyEffect) {
            // Since ios13 UIAlertController has some effects which cause
            // semi-transparency and interfere with color customizations:
            uiView.effect = null;
        }
        const subViewsCount = uiView.subviews.count;
        for (let i = 0; i < subViewsCount; i++) {
            DateTimePicker._clearVibrancyEffects(uiView.subviews[i]);
        }
    }

    private static _getLabelContainer(uiView: UIView) {
        if (uiView.superview.class() === (UIView.class())) {
            return uiView.superview;
        }
        return DateTimePicker._getLabelContainer(uiView.superview);
    }

    private static _findLabelWithText(uiView: UIView, text: string) {
        if ((uiView instanceof UILabel) && uiView.text === text) {
            return uiView;
        }
        const subViewsCount = uiView.subviews.count;
        for (let i = 0; i < subViewsCount; i++) {
            let label = DateTimePicker._findLabelWithText(uiView.subviews[i], text);
            if (label) {
                return label;
            }
        }
        return null;
    }
}
